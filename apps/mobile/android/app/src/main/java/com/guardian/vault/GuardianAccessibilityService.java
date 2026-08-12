package com.guardian.vault;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityManager;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.ArrayDeque;
import java.util.List;

public class GuardianAccessibilityService extends AccessibilityService {
  private static final String TAG = "GuardianA11y";
  private static GuardianAccessibilityService instance;
  private static PendingFill pendingFill;

  private AccessibilityNodeInfo lastFocusedEditable;
  private AccessibilityNodeInfo lastUsernameNode;
  private AccessibilityNodeInfo lastPasswordNode;
  private String trackedPackageName = "";

  @Override
  protected void onServiceConnected() {
    super.onServiceConnected();
    instance = this;

    AccessibilityServiceInfo info = getServiceInfo();
    if (info != null) {
      info.flags |= AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        info.flags |= AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
      }
      setServiceInfo(info);
    }
  }

  @Override
  public void onAccessibilityEvent(AccessibilityEvent event) {
    if (event == null) return;

    String packageName = event.getPackageName() != null ? event.getPackageName().toString() : "";
    if (TextUtils.isEmpty(packageName)) return;

    if (getPackageName().equals(packageName)) {
      return;
    }

    AccessibilityNodeInfo root = getRootInActiveWindow();
    if (root != null) {
      scanWindow(root, packageName);
    }

    AccessibilityNodeInfo source = event.getSource();
    if (source != null) {
      try {
        if (isEditable(source)) {
          trackedPackageName = packageName;
          replaceNode(FillTarget.FOCUSED, source);
          if (looksLikePassword(source)) replaceNode(FillTarget.PASSWORD, source);
          else if (looksLikeUsername(source)) replaceNode(FillTarget.USERNAME, source);
        }
      } finally {
        source.recycle();
      }
    }

    PendingFill fill = pendingFill;
    if (fill != null && packageName.equals(fill.packageName)) {
      boolean ok = fillCredentialsInternal(fill.username, fill.password);
      Log.i(TAG, "deferred fill pkg=" + packageName + " ok=" + ok);
      if (ok) pendingFill = null;
    }
  }

  @Override
  public void onInterrupt() {
    // No-op.
  }

  @Override
  public boolean onUnbind(android.content.Intent intent) {
    clearTrackedNodes();
    if (instance == this) instance = null;
    return super.onUnbind(intent);
  }

  public static boolean isEnabled(Context context) {
    AccessibilityManager manager = (AccessibilityManager) context.getSystemService(Context.ACCESSIBILITY_SERVICE);
    if (manager != null) {
      List<AccessibilityServiceInfo> enabled = manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK);
      for (AccessibilityServiceInfo info : enabled) {
        String id = info.getId();
        if (!TextUtils.isEmpty(id) && id.equals(context.getPackageName() + "/.GuardianAccessibilityService")) {
          return true;
        }
      }
    }

    try {
      int enabled = Settings.Secure.getInt(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, 0);
      if (enabled != 1) return false;
      String services = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
      return services != null && services.contains(context.getPackageName() + "/.GuardianAccessibilityService");
    } catch (Exception ignored) {
      return false;
    }
  }

  public static boolean fillCredentials(Context context, String username, String password) {
    GuardianAccessibilityService service = instance;
    if (service == null) return false;
    return service.fillCredentialsInternal(username, password);
  }

  public static boolean requestDeferredFill(String packageName, String username, String password) {
    if (TextUtils.isEmpty(packageName) || TextUtils.isEmpty(password)) return false;
    pendingFill = new PendingFill(packageName, username, password);
    GuardianAccessibilityService service = instance;
    if (service != null) {
      Log.i(TAG, "queued deferred fill pkg=" + packageName);
    }
    return true;
  }

  private boolean fillCredentialsInternal(String username, String password) {
    if (TextUtils.isEmpty(password)) return false;

    ScanResult freshScan = scanActiveWindow();
    AccessibilityNodeInfo usernameNode = refreshNode(lastUsernameNode);
    AccessibilityNodeInfo passwordNode = refreshNode(lastPasswordNode);
    AccessibilityNodeInfo focusedNode = refreshNode(lastFocusedEditable);

    if (freshScan != null) {
      if (usernameNode == null && freshScan.username != null) {
        usernameNode = AccessibilityNodeInfo.obtain(freshScan.username);
      }
      if (passwordNode == null && freshScan.password != null) {
        passwordNode = AccessibilityNodeInfo.obtain(freshScan.password);
      }
      if (focusedNode == null && freshScan.focused != null) {
        focusedNode = AccessibilityNodeInfo.obtain(freshScan.focused);
      }
    }

    if (passwordNode == null && focusedNode != null && looksLikePassword(focusedNode)) {
      passwordNode = focusedNode;
    }
    if (usernameNode == null && focusedNode != null && !looksLikePassword(focusedNode)) {
      usernameNode = focusedNode;
    }
    if (usernameNode == null && !TextUtils.isEmpty(username) && freshScan != null) {
      if (freshScan.editableBeforePassword != null) {
        usernameNode = AccessibilityNodeInfo.obtain(freshScan.editableBeforePassword);
      } else if (freshScan.firstEditable != null && (passwordNode == null || !sameNode(freshScan.firstEditable, passwordNode))) {
        usernameNode = AccessibilityNodeInfo.obtain(freshScan.firstEditable);
      }
    }

    boolean filled = false;
    if (!TextUtils.isEmpty(username) && usernameNode != null) {
      filled |= setNodeText(usernameNode, username);
    }
    if (passwordNode != null) {
      filled |= setNodeText(passwordNode, password);
    }

    Log.i(TAG, "fillCredentialsInternal pkg=" + trackedPackageName + " ok=" + filled);
    return filled;
  }

  private void scanWindow(AccessibilityNodeInfo root, String packageName) {
    ScanResult scan = scanTree(root);

    trackedPackageName = packageName;
    if (scan.focused != null) {
      replaceNode(FillTarget.FOCUSED, scan.focused);
      scan.focused.recycle();
    }
    if (scan.username != null) {
      replaceNode(FillTarget.USERNAME, scan.username);
      scan.username.recycle();
    }
    if (scan.password != null) {
      replaceNode(FillTarget.PASSWORD, scan.password);
      scan.password.recycle();
    }
    if (scan.editableBeforePassword != null) scan.editableBeforePassword.recycle();
    if (scan.firstEditable != null) scan.firstEditable.recycle();
  }

  private ScanResult scanActiveWindow() {
    AccessibilityNodeInfo root = getRootInActiveWindow();
    if (root == null) return null;
    try {
      return scanTree(root);
    } finally {
      root.recycle();
    }
  }

  private ScanResult scanTree(AccessibilityNodeInfo root) {
    ScanResult result = new ScanResult();
    ArrayDeque<AccessibilityNodeInfo> stack = new ArrayDeque<>();
    stack.push(AccessibilityNodeInfo.obtain(root));

    AccessibilityNodeInfo previousEditable = null;

    while (!stack.isEmpty()) {
      AccessibilityNodeInfo node = stack.pop();
      if (node == null) continue;

      if (isEditable(node)) {
        if (result.firstEditable == null) result.firstEditable = AccessibilityNodeInfo.obtain(node);
        if (node.isFocused() && result.focused == null) result.focused = AccessibilityNodeInfo.obtain(node);
        if (looksLikePassword(node) && result.password == null) {
          result.password = AccessibilityNodeInfo.obtain(node);
          if (result.username == null && previousEditable != null) {
            result.editableBeforePassword = AccessibilityNodeInfo.obtain(previousEditable);
          }
        } else if (looksLikeUsername(node) && result.username == null) {
          result.username = AccessibilityNodeInfo.obtain(node);
        }

        if (previousEditable != null) previousEditable.recycle();
        previousEditable = AccessibilityNodeInfo.obtain(node);
      }

      for (int i = node.getChildCount() - 1; i >= 0; i--) {
        AccessibilityNodeInfo child = node.getChild(i);
        if (child != null) stack.push(child);
      }
      node.recycle();
    }

    if (result.username == null && result.editableBeforePassword != null) {
      result.username = AccessibilityNodeInfo.obtain(result.editableBeforePassword);
    }
    if (previousEditable != null) previousEditable.recycle();
    return result;
  }

  private boolean setNodeText(AccessibilityNodeInfo node, String value) {
    Bundle args = new Bundle();
    args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value);
    boolean ok = node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
    if (!ok) {
      node.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
      ok = node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
    }
    return ok;
  }

  private AccessibilityNodeInfo refreshNode(AccessibilityNodeInfo node) {
    if (node == null) return null;
    try {
      if (!node.refresh()) return null;
      return node;
    } catch (Exception ignored) {
      return null;
    }
  }

  private boolean sameNode(AccessibilityNodeInfo a, AccessibilityNodeInfo b) {
    if (a == null || b == null) return false;
    try {
      return a.equals(b);
    } catch (Exception ignored) {
      return false;
    }
  }

  private boolean isEditable(AccessibilityNodeInfo node) {
    if (node == null) return false;
    CharSequence className = node.getClassName();
    return node.isEditable() || (className != null && className.toString().contains("EditText"));
  }

  private boolean looksLikePassword(AccessibilityNodeInfo node) {
    if (node == null) return false;
    if (node.isPassword()) return true;
    String hay = collectNodeHints(node);
    return hay.contains("password") || hay.contains("passcode") || hay.contains("senha");
  }

  private boolean looksLikeUsername(AccessibilityNodeInfo node) {
    if (node == null) return false;
    String hay = collectNodeHints(node);
    return hay.contains("email") || hay.contains("user") || hay.contains("login") || hay.contains("account");
  }

  private String collectNodeHints(AccessibilityNodeInfo node) {
    StringBuilder sb = new StringBuilder();
    appendLower(sb, node.getHintText());
    appendLower(sb, node.getViewIdResourceName());
    appendLower(sb, node.getText());
    appendLower(sb, node.getContentDescription());
    return sb.toString();
  }

  private void appendLower(StringBuilder sb, CharSequence value) {
    if (value == null) return;
    if (sb.length() > 0) sb.append(' ');
    sb.append(value.toString().toLowerCase());
  }

  private void replaceNode(FillTarget target, AccessibilityNodeInfo node) {
    AccessibilityNodeInfo copy = AccessibilityNodeInfo.obtain(node);
    switch (target) {
      case FOCUSED:
        recycleNode(lastFocusedEditable);
        lastFocusedEditable = copy;
        break;
      case USERNAME:
        recycleNode(lastUsernameNode);
        lastUsernameNode = copy;
        break;
      case PASSWORD:
        recycleNode(lastPasswordNode);
        lastPasswordNode = copy;
        break;
    }
  }

  private void clearTrackedNodes() {
    recycleNode(lastFocusedEditable);
    recycleNode(lastUsernameNode);
    recycleNode(lastPasswordNode);
    lastFocusedEditable = null;
    lastUsernameNode = null;
    lastPasswordNode = null;
    trackedPackageName = "";
  }

  private void recycleNode(AccessibilityNodeInfo node) {
    if (node == null) return;
    try {
      node.recycle();
    } catch (Exception ignored) {
    }
  }

  private enum FillTarget {
    FOCUSED,
    USERNAME,
    PASSWORD
  }

  private static final class PendingFill {
    final String packageName;
    final String username;
    final String password;

    PendingFill(String packageName, String username, String password) {
      this.packageName = packageName;
      this.username = username;
      this.password = password;
    }
  }

  private static final class ScanResult {
    AccessibilityNodeInfo focused;
    AccessibilityNodeInfo username;
    AccessibilityNodeInfo password;
    AccessibilityNodeInfo editableBeforePassword;
    AccessibilityNodeInfo firstEditable;
  }
}
