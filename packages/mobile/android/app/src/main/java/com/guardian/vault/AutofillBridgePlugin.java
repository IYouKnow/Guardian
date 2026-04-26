package com.guardian.vault;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "AutofillBridge")
public class AutofillBridgePlugin extends Plugin {
  @PluginMethod
  public void getPendingSave(PluginCall call) {
    SharedPreferences prefs = getContext().getSharedPreferences(GuardianAutofillService.PREFS, Context.MODE_PRIVATE);

    String username = prefs.getString(GuardianAutofillService.KEY_USERNAME, "");
    String password = prefs.getString(GuardianAutofillService.KEY_PASSWORD, "");
    String packageName = prefs.getString(GuardianAutofillService.KEY_PACKAGE, "");
    String appLabel = prefs.getString(GuardianAutofillService.KEY_APP_LABEL, "");
    long ts = prefs.getLong(GuardianAutofillService.KEY_TS, 0);

    JSObject res = new JSObject();
    JSObject pending = new JSObject();
    if (!TextUtils.isEmpty(password)) {
      pending.put("username", username);
      pending.put("password", password);
      pending.put("packageName", packageName);
      pending.put("appLabel", appLabel);
      pending.put("timestampMs", ts);
      res.put("pending", pending);
    } else {
      res.put("pending", null);
    }

    call.resolve(res);
  }

  @PluginMethod
  public void clearPendingSave(PluginCall call) {
    SharedPreferences prefs = getContext().getSharedPreferences(GuardianAutofillService.PREFS, Context.MODE_PRIVATE);
    prefs.edit().clear().apply();
    JSObject res = new JSObject();
    res.put("ok", true);
    call.resolve(res);
  }
}
