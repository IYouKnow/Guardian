package com.guardian.vault;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.text.TextUtils;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "AutofillBridge")
public class AutofillBridgePlugin extends Plugin {
  private static final String TAG = "AutofillBridge";
  private static final String PREFS = "guardian_autofill_config";
  private static final String KEY_INLINE_SERVER_MODE = "inline_server_mode";
  public static final String EXTRA_INLINE_AUTH = "guardian.inline_auth";
  private BroadcastReceiver pendingReceiver;

  static boolean isInlineAutofillServerModeEnabled(Context context) {
    SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    return prefs.getBoolean(KEY_INLINE_SERVER_MODE, false);
  }

  @Override
  public void load() {
    super.load();

    pendingReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        if (!PendingAutofillStore.ACTION_PENDING_SAVE_ADDED.equals(intent.getAction())) return;

        String id = intent.getStringExtra(PendingAutofillStore.EXTRA_ID);
        PendingAutofillStore.Item item = PendingAutofillStore.getById(getContext(), id);
        if (item == null) item = PendingAutofillStore.peekNext(getContext());
        if (item == null) return;

        Log.i(TAG, "broadcast pendingSave id=" + item.id + " pkg=" + item.packageName);

        JSObject pending = new JSObject();
        pending.put("id", item.id);
        pending.put("username", item.username);
        pending.put("password", item.password);
        pending.put("packageName", item.packageName);
        pending.put("appLabel", item.appLabel);
        pending.put("timestampMs", item.timestampMs);

        JSObject data = new JSObject();
        data.put("pending", pending);

        // Retain event for late listeners (e.g., app cold start / plugin init).
        notifyListeners("pendingSave", data, true);
      }
    };

    IntentFilter filter = new IntentFilter(PendingAutofillStore.ACTION_PENDING_SAVE_ADDED);
    try {
      if (Build.VERSION.SDK_INT >= 33) {
        getContext().registerReceiver(pendingReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
      } else {
        getContext().registerReceiver(pendingReceiver, filter);
      }
    } catch (Exception ignored) {
      // No-op: app will still pick up pending saves via getPendingSave polling.
    }
  }

  @Override
  protected void handleOnDestroy() {
    try {
      if (pendingReceiver != null) {
        getContext().unregisterReceiver(pendingReceiver);
      }
    } catch (Exception ignored) {
    } finally {
      pendingReceiver = null;
    }
    super.handleOnDestroy();
  }

  @PluginMethod
  public void getPendingSave(PluginCall call) {
    JSObject res = new JSObject();

    PendingAutofillStore.Item item = PendingAutofillStore.peekNext(getContext());
    if (item != null && !TextUtils.isEmpty(item.password)) {
      Log.d(TAG, "getPendingSave -> id=" + item.id + " pkg=" + item.packageName);
      JSObject pending = new JSObject();
      pending.put("id", item.id);
      pending.put("username", item.username);
      pending.put("password", item.password);
      pending.put("packageName", item.packageName);
      pending.put("appLabel", item.appLabel);
      pending.put("timestampMs", item.timestampMs);
      res.put("pending", pending);
    } else {
      Log.d(TAG, "getPendingSave -> null");
      res.put("pending", null);
    }

    call.resolve(res);
  }

  @PluginMethod
  public void ackPendingSave(PluginCall call) {
    String id = call.getString("id", "");
    boolean ok = PendingAutofillStore.remove(getContext(), id);
    Log.i(TAG, "ackPendingSave id=" + id + " ok=" + ok);
    JSObject res = new JSObject();
    res.put("ok", ok);
    call.resolve(res);
  }

  @PluginMethod
  public void clearPendingSave(PluginCall call) {
    String id = call.getString("id", "");
    if (!TextUtils.isEmpty(id)) {
      boolean ok = PendingAutofillStore.remove(getContext(), id);
      Log.i(TAG, "clearPendingSave(id) id=" + id + " ok=" + ok);
      JSObject res = new JSObject();
      res.put("ok", ok);
      call.resolve(res);
      return;
    }

    PendingAutofillStore.clearAll(getContext());
    Log.i(TAG, "clearPendingSave(all) ok=true");
    JSObject res = new JSObject();
    res.put("ok", true);
    call.resolve(res);
  }

  @PluginMethod
  public void getLaunchContext(PluginCall call) {
    JSObject res = new JSObject();
    Intent intent = getActivity() != null ? getActivity().getIntent() : null;
    boolean inlineAuth = intent != null && intent.getBooleanExtra(EXTRA_INLINE_AUTH, false);
    String activity = getActivity() != null ? getActivity().getClass().getSimpleName() : "";
    res.put("inlineAuth", inlineAuth);
    res.put("activity", activity);
    call.resolve(res);
  }

  @PluginMethod
  public void finishHostActivity(PluginCall call) {
    if (getActivity() != null) {
      getActivity().runOnUiThread(() -> {
        try {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getActivity().finishAndRemoveTask();
          } else {
            getActivity().finish();
          }
        } catch (Exception ignored) {
          getActivity().finish();
        }
      });
    }
    call.resolve();
  }

  @PluginMethod
  public void openMainApp(PluginCall call) {
    if (getActivity() != null) {
      Intent intent = new Intent(getActivity(), MainActivity.class);
      intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
      getActivity().startActivity(intent);
      getActivity().finish();
    }
    call.resolve();
  }

  @PluginMethod
  public void setInlineAutofillServerMode(PluginCall call) {
    boolean enabled = call.getBoolean("enabled", false);
    SharedPreferences prefs = getContext().getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    prefs.edit().putBoolean(KEY_INLINE_SERVER_MODE, enabled).apply();
    JSObject res = new JSObject();
    res.put("ok", true);
    call.resolve(res);
  }
}
