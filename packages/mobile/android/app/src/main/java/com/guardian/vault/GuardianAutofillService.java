package com.guardian.vault;

import android.app.assist.AssistStructure;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Build;
import android.service.autofill.AutofillService;
import android.service.autofill.FillCallback;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveInfo;
import android.service.autofill.SaveRequest;
import android.text.InputType;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

@RequiresApi(api = Build.VERSION_CODES.O)
public class GuardianAutofillService extends AutofillService {
  private static final String TAG = "GuardianAutofill";
  private static final String STATE_USERNAME_ID = "guardian.usernameAutofillId";
  private static final String STATE_PASSWORD_ID = "guardian.passwordAutofillId";

  @Override
  public void onFillRequest(
    @NonNull FillRequest request,
    @NonNull android.os.CancellationSignal cancellationSignal,
    @NonNull FillCallback callback
  ) {
    try {
      AssistStructure structure = AutofillStructureParser.latestStructure(request);
      if (structure == null) {
        callback.onSuccess(null);
        return;
      }

      AutofillStructureParser.ParsedIds ids = AutofillStructureParser.findSaveIds(structure);
      if (ids == null || ids.passwordId == null) {
        callback.onSuccess(null);
        return;
      }

      List<AutofillId> requiredIds = new ArrayList<>();
      requiredIds.add(ids.passwordId);
      if (ids.usernameId != null) requiredIds.add(ids.usernameId);

      ComponentName activity = structure.getActivityComponent();
      String packageName = activity != null ? activity.getPackageName() : "";
      String appLabel = "";
      if (!TextUtils.isEmpty(packageName)) {
        try {
          PackageManager pm = getPackageManager();
          appLabel = pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString();
        } catch (Exception ignored) {
        }
      }

      SaveInfo saveInfo = new SaveInfo.Builder(SaveInfo.SAVE_DATA_TYPE_PASSWORD, requiredIds.toArray(new AutofillId[0]))
        .setDescription("Save to Guardian")
        .build();

      Bundle clientState = new Bundle();
      if (ids.usernameId != null) clientState.putParcelable(STATE_USERNAME_ID, ids.usernameId);
      if (ids.passwordId != null) clientState.putParcelable(STATE_PASSWORD_ID, ids.passwordId);

      Intent authIntent = new Intent(this, AutofillAuthActivity.class);
      authIntent.putExtra(AutofillBridgePlugin.EXTRA_INLINE_AUTH, true);
      authIntent.putExtra(AutofillBridgePlugin.EXTRA_AUTOFILL_FLOW, AutofillBridgePlugin.AUTOFILL_FLOW_FILL);
      authIntent.putExtra(AutofillBridgePlugin.EXTRA_FILL_PACKAGE_NAME, packageName);
      authIntent.putExtra(AutofillBridgePlugin.EXTRA_FILL_APP_LABEL, appLabel);
      authIntent.putExtra(AutofillBridgePlugin.EXTRA_FILL_USERNAME_ID, ids.usernameId);
      authIntent.putExtra(AutofillBridgePlugin.EXTRA_FILL_PASSWORD_ID, ids.passwordId);
      authIntent.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK
          | Intent.FLAG_ACTIVITY_MULTIPLE_TASK
          | Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
          | Intent.FLAG_ACTIVITY_NO_ANIMATION
      );

      int pendingIntentFlags = PendingIntent.FLAG_CANCEL_CURRENT;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        pendingIntentFlags |= PendingIntent.FLAG_MUTABLE;
      }

      PendingIntent authPendingIntent = PendingIntent.getActivity(
        this,
        1001,
        authIntent,
        pendingIntentFlags
      );

      RemoteViews authPresentation = createSingleLinePresentation(
        this,
        TextUtils.isEmpty(appLabel) ? "Unlock with Guardian" : "Use Guardian for " + appLabel
      );

      FillResponse response = new FillResponse.Builder()
        .setAuthentication(
          requiredIds.toArray(new AutofillId[0]),
          authPendingIntent.getIntentSender(),
          authPresentation
        )
        .setClientState(clientState)
        .setSaveInfo(saveInfo)
        .build();
      callback.onSuccess(response);
    } catch (Exception ignored) {
      callback.onSuccess(null);
    }
  }

  @Override
  public void onSaveRequest(@NonNull SaveRequest request, @NonNull SaveCallback callback) {
    try {
      AssistStructure structure = AutofillStructureParser.latestStructure(request);
      ComponentName activity = structure != null ? structure.getActivityComponent() : null;
      String packageName = activity != null ? activity.getPackageName() : "";
      String appLabel = "";
      if (!TextUtils.isEmpty(packageName)) {
        try {
          PackageManager pm = getPackageManager();
          appLabel = pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString();
        } catch (Exception ignored) {
        }
      }

      AutofillStructureParser.ParsedValues values = null;
      if (structure != null) {
        Bundle clientState = request.getClientState();
        AutofillId usernameId = clientState != null ? clientState.getParcelable(STATE_USERNAME_ID) : null;
        AutofillId passwordId = clientState != null ? clientState.getParcelable(STATE_PASSWORD_ID) : null;
        values = AutofillStructureParser.extractValues(structure, usernameId, passwordId);
      }

      String username = values != null ? values.username : "";
      String password = values != null ? values.password : "";

      if (!TextUtils.isEmpty(password)) {
        PendingAutofillStore.Item item = PendingAutofillStore.add(this, username, password, packageName, appLabel);
        Log.i(
          TAG,
          "onSaveRequest captured pending save"
            + " id=" + (item != null ? item.id : "null")
            + " pkg=" + packageName
            + " app=" + appLabel
            + " userLen=" + (username != null ? username.length() : 0)
            + " passLen=" + password.length()
        );

        // Best-effort notify the running app (if any).
        if (item != null) {
          Intent broadcast = new Intent(PendingAutofillStore.ACTION_PENDING_SAVE_ADDED);
          broadcast.setPackage(getPackageName());
          broadcast.putExtra(PendingAutofillStore.EXTRA_ID, item.id);
          sendBroadcast(broadcast);
        }

        // Bring Guardian to foreground to prompt the user.
        Class<?> targetActivity = AutofillBridgePlugin.isInlineAutofillServerModeEnabled(this)
          ? AutofillAuthActivity.class
          : MainActivity.class;
        Intent intent = new Intent(this, targetActivity);
        intent.putExtra(AutofillBridgePlugin.EXTRA_INLINE_AUTH, targetActivity == AutofillAuthActivity.class);
        if (targetActivity == AutofillAuthActivity.class) {
          intent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
              | Intent.FLAG_ACTIVITY_MULTIPLE_TASK
              | Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
              | Intent.FLAG_ACTIVITY_NO_ANIMATION
          );
        } else {
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        }
        startActivity(intent);
      }

      callback.onSuccess();
    } catch (Exception ignored) {
      Log.w(TAG, "onSaveRequest failed", ignored);
      callback.onFailure("Failed to save");
    }
  }

  private static RemoteViews createSingleLinePresentation(Context context, String text) {
    RemoteViews views = new RemoteViews("com.guardian.vault", R.layout.autofill_suggestion_chip);
    String theme = AutofillBridgePlugin.getAutofillPresentationTheme(context);
    boolean light = "light".equalsIgnoreCase(theme);
    views.setInt(
      R.id.autofill_chip_root,
      "setBackgroundResource",
      light ? R.drawable.autofill_chip_bg_light : R.drawable.autofill_chip_bg_dark
    );
    views.setInt(android.R.id.text1, "setTextColor", light ? 0xFF2E2610 : 0xFFF9E7A3);
    views.setTextViewText(android.R.id.text1, text);
    return views;
  }

  static final class AutofillStructureParser {
    static final class ParsedIds {
      AutofillId usernameId;
      AutofillId passwordId;
    }

    static final class ParsedValues {
      String username = "";
      String password = "";
    }

    static AssistStructure latestStructure(FillRequest request) {
      if (request.getFillContexts() == null || request.getFillContexts().isEmpty()) return null;
      return request.getFillContexts().get(request.getFillContexts().size() - 1).getStructure();
    }

    static AssistStructure latestStructure(SaveRequest request) {
      if (request.getFillContexts() == null || request.getFillContexts().isEmpty()) return null;
      return request.getFillContexts().get(request.getFillContexts().size() - 1).getStructure();
    }

    static ParsedIds findSaveIds(AssistStructure structure) {
      ParsedIds parsed = new ParsedIds();
      int windows = structure.getWindowNodeCount();
      for (int w = 0; w < windows; w++) {
        AssistStructure.WindowNode windowNode = structure.getWindowNodeAt(w);
        AssistStructure.ViewNode root = windowNode.getRootViewNode();
        traverseForIds(root, parsed);
      }
      return parsed.passwordId != null ? parsed : null;
    }

    static ParsedValues extractValues(AssistStructure structure, AutofillId usernameId, AutofillId passwordId) {
      if (usernameId != null || passwordId != null) {
        ParsedValues byId = extractValuesByAutofillId(structure, usernameId, passwordId);
        if (!TextUtils.isEmpty(byId.password)) return byId;
      }

      return extractValues(structure);
    }

    static ParsedValues extractValues(AssistStructure structure) {
      ParsedValues parsed = new ParsedValues();
      int windows = structure.getWindowNodeCount();
      for (int w = 0; w < windows; w++) {
        AssistStructure.WindowNode windowNode = structure.getWindowNodeAt(w);
        AssistStructure.ViewNode root = windowNode.getRootViewNode();
        traverseForValues(root, parsed);
      }
      return parsed;
    }

    static ParsedValues extractValuesByAutofillId(AssistStructure structure, AutofillId usernameId, AutofillId passwordId) {
      ParsedValues parsed = new ParsedValues();
      int windows = structure.getWindowNodeCount();
      for (int w = 0; w < windows; w++) {
        AssistStructure.WindowNode windowNode = structure.getWindowNodeAt(w);
        AssistStructure.ViewNode root = windowNode.getRootViewNode();
        traverseForValuesByAutofillId(root, parsed, usernameId, passwordId);
      }
      return parsed;
    }

    static void traverseForIds(AssistStructure.ViewNode node, ParsedIds out) {
      if (node == null) return;

      int inputType = node.getInputType();
      if (out.passwordId == null && isPasswordInputType(inputType)) out.passwordId = node.getAutofillId();
      if (out.usernameId == null && isEmailInputType(inputType)) out.usernameId = node.getAutofillId();
      if (out.passwordId == null && nodeIsPassword(node)) out.passwordId = node.getAutofillId();

      String[] hints = node.getAutofillHints();
      if (hints != null) {
        for (String hint : hints) {
          if (out.passwordId == null && isPasswordHint(hint)) out.passwordId = node.getAutofillId();
          if (out.usernameId == null && isUsernameHint(hint)) out.usernameId = node.getAutofillId();
        }
      }

      String idEntry = node.getIdEntry();
      if (!TextUtils.isEmpty(idEntry)) {
        String lower = idEntry.toLowerCase();
        if (out.passwordId == null && lower.contains("pass")) out.passwordId = node.getAutofillId();
        if (out.usernameId == null && (lower.contains("user") || lower.contains("email") || lower.contains("login"))) {
          out.usernameId = node.getAutofillId();
        }
      }

      CharSequence hintText = node.getHint();
      if (out.usernameId == null && hintLooksLikeUsername(hintText)) {
        out.usernameId = node.getAutofillId();
      }

      int count = node.getChildCount();
      for (int i = 0; i < count; i++) traverseForIds(node.getChildAt(i), out);
    }

    static void traverseForValues(AssistStructure.ViewNode node, ParsedValues out) {
      if (node == null) return;

      String value = readNodeText(node);
      if (!TextUtils.isEmpty(value)) {
        int inputType = node.getInputType();
        if (TextUtils.isEmpty(out.password) && isPasswordInputType(inputType)) out.password = value;
        if (TextUtils.isEmpty(out.username) && isEmailInputType(inputType)) out.username = value;
        if (TextUtils.isEmpty(out.password) && nodeIsPassword(node)) out.password = value;

        String[] hints = node.getAutofillHints();
        if (hints != null) {
          for (String hint : hints) {
            if (TextUtils.isEmpty(out.password) && isPasswordHint(hint)) out.password = value;
            if (TextUtils.isEmpty(out.username) && isUsernameHint(hint)) out.username = value;
          }
        }

        String idEntry = node.getIdEntry();
        if (!TextUtils.isEmpty(idEntry)) {
          String lower = idEntry.toLowerCase();
          if (TextUtils.isEmpty(out.password) && lower.contains("pass")) out.password = value;
          if (TextUtils.isEmpty(out.username) && (lower.contains("user") || lower.contains("email") || lower.contains("login"))) {
            out.username = value;
          }
        }

        CharSequence hintText = node.getHint();
        if (TextUtils.isEmpty(out.username) && hintLooksLikeUsername(hintText)) {
          out.username = value;
        }
      }

      int count = node.getChildCount();
      for (int i = 0; i < count; i++) traverseForValues(node.getChildAt(i), out);
    }

    static void traverseForValuesByAutofillId(
      AssistStructure.ViewNode node,
      ParsedValues out,
      AutofillId usernameId,
      AutofillId passwordId
    ) {
      if (node == null) return;

      AutofillId nodeId = node.getAutofillId();
      if (nodeId != null) {
        if (passwordId != null && passwordId.equals(nodeId) && TextUtils.isEmpty(out.password)) {
          out.password = readNodeText(node);
        }
        if (usernameId != null && usernameId.equals(nodeId) && TextUtils.isEmpty(out.username)) {
          out.username = readNodeText(node);
        }
      }

      if (!TextUtils.isEmpty(out.password) && (usernameId == null || !TextUtils.isEmpty(out.username))) {
        return;
      }

      int count = node.getChildCount();
      for (int i = 0; i < count; i++) {
        traverseForValuesByAutofillId(node.getChildAt(i), out, usernameId, passwordId);
      }
    }

    static String readNodeText(AssistStructure.ViewNode node) {
      AutofillValue autofillValue = node.getAutofillValue();
      if (autofillValue != null && autofillValue.isText()) {
        CharSequence cs = autofillValue.getTextValue();
        return cs != null ? cs.toString() : "";
      }
      CharSequence text = node.getText();
      if (text != null) return text.toString();
      CharSequence hint = node.getHint();
      // Hint is not a value; ignore for extraction.
      return "";
    }

    static boolean isPasswordHint(String hint) {
      if (hint == null) return false;
      if (View.AUTOFILL_HINT_PASSWORD.equals(hint)) return true;
      String lower = hint.toLowerCase();
      return lower.contains("password") || lower.contains("pass");
    }

    static boolean isUsernameHint(String hint) {
      if (hint == null) return false;
      return View.AUTOFILL_HINT_USERNAME.equals(hint)
        || View.AUTOFILL_HINT_EMAIL_ADDRESS.equals(hint)
        || View.AUTOFILL_HINT_PHONE.equals(hint);
    }

    static boolean isPasswordInputType(int inputType) {
      if (inputType == 0) return false;
      int variation = inputType & InputType.TYPE_MASK_VARIATION;
      return variation == InputType.TYPE_TEXT_VARIATION_PASSWORD
        || variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
        || variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
        || variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD;
    }

    static boolean isEmailInputType(int inputType) {
      if (inputType == 0) return false;
      int variation = inputType & InputType.TYPE_MASK_VARIATION;
      return variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
        || variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS;
    }

    static boolean hintLooksLikeUsername(CharSequence hint) {
      if (hint == null) return false;
      String lower = hint.toString().toLowerCase();
      return lower.contains("user")
        || lower.contains("email")
        || lower.contains("login")
        || lower.contains("account");
    }

    static boolean nodeIsPassword(AssistStructure.ViewNode node) {
      try {
        Method m = node.getClass().getMethod("isPassword");
        Object res = m.invoke(node);
        return res instanceof Boolean && (Boolean) res;
      } catch (Exception ignored) {
        return false;
      }
    }
  }
}
