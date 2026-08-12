package com.guardian.vault;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.service.autofill.Dataset;
import android.service.autofill.FillResponse;
import android.text.TextUtils;
import android.util.Log;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillManager;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import org.json.JSONObject;

@CapacitorPlugin(name = "AutofillBridge")
public class AutofillBridgePlugin extends Plugin {
  private static final String TAG = "AutofillBridge";
  private static final String PREFS = "guardian_autofill_config";
  private static final String KEY_INLINE_SERVER_MODE = "inline_server_mode";
  private static final String KEY_PRESENTATION_THEME = "presentation_theme";
  public static final String EXTRA_INLINE_AUTH = "guardian.inline_auth";
  public static final String EXTRA_AUTOFILL_FLOW = "guardian.autofill_flow";
  public static final String AUTOFILL_FLOW_FILL = "fill";
  public static final String AUTOFILL_FLOW_SAVE = "save";
  public static final String EXTRA_FILL_PACKAGE_NAME = "guardian.fill.package_name";
  public static final String EXTRA_FILL_APP_LABEL = "guardian.fill.app_label";
  public static final String EXTRA_FILL_USERNAME_ID = "guardian.fill.username_id";
  public static final String EXTRA_FILL_PASSWORD_ID = "guardian.fill.password_id";
  public static final String EXTRA_SAVE_ID = "guardian.save.id";
  public static final String EXTRA_SAVE_USERNAME = "guardian.save.username";
  public static final String EXTRA_SAVE_PASSWORD = "guardian.save.password";
  public static final String EXTRA_SAVE_PACKAGE_NAME = "guardian.save.package_name";
  public static final String EXTRA_SAVE_APP_LABEL = "guardian.save.app_label";
  public static final String EXTRA_SAVE_APP_ICON_DATA_URL = "guardian.save.app_icon_data_url";
  public static final String EXTRA_SAVE_TIMESTAMP_MS = "guardian.save.timestamp_ms";
  private BroadcastReceiver pendingReceiver;

  static boolean isInlineAutofillServerModeEnabled(Context context) {
    SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    return prefs.getBoolean(KEY_INLINE_SERVER_MODE, false);
  }

  static String getAutofillPresentationTheme(Context context) {
    SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    return prefs.getString(KEY_PRESENTATION_THEME, "dark");
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
        pending.put("appIconDataUrl", item.appIconDataUrl);
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
    JSObject intentPending = getPendingSaveFromIntent();
    if (intentPending != null) {
      res.put("pending", intentPending);
      call.resolve(res);
      return;
    }

    PendingAutofillStore.Item item = PendingAutofillStore.peekNext(getContext());
    if (item != null && !TextUtils.isEmpty(item.password)) {
      Log.d(TAG, "getPendingSave -> id=" + item.id + " pkg=" + item.packageName);
      JSObject pending = new JSObject();
      pending.put("id", item.id);
      pending.put("username", item.username);
      pending.put("password", item.password);
      pending.put("packageName", item.packageName);
      pending.put("appLabel", item.appLabel);
      pending.put("appIconDataUrl", item.appIconDataUrl);
      pending.put("timestampMs", item.timestampMs);
      res.put("pending", pending);
    } else {
      res.put("pending", null);
    }

    call.resolve(res);
  }

  @PluginMethod
  public void getFillRequest(PluginCall call) {
    JSObject res = new JSObject();
    Intent intent = getActivity() != null ? getActivity().getIntent() : null;
    String flow = intent != null ? intent.getStringExtra(EXTRA_AUTOFILL_FLOW) : null;
    if (!AUTOFILL_FLOW_FILL.equals(flow)) {
      res.put("request", null);
      call.resolve(res);
      return;
    }

    AutofillId usernameId = getAutofillIdExtra(intent, EXTRA_FILL_USERNAME_ID);
    AutofillId passwordId = getAutofillIdExtra(intent, EXTRA_FILL_PASSWORD_ID);
    JSObject request = new JSObject();
    request.put("packageName", intent != null ? intent.getStringExtra(EXTRA_FILL_PACKAGE_NAME) : "");
    request.put("appLabel", intent != null ? intent.getStringExtra(EXTRA_FILL_APP_LABEL) : "");
    request.put("hasUsernameField", usernameId != null);
    request.put("hasPasswordField", passwordId != null);
    res.put("request", request);
    call.resolve(res);
  }

  @PluginMethod
  public void getAccessibilityStatus(PluginCall call) {
    JSObject res = new JSObject();
    res.put("enabled", GuardianAccessibilityService.isEnabled(getContext()));
    call.resolve(res);
  }

  @PluginMethod
  public void openAccessibilitySettings(PluginCall call) {
    Context context = getActivity() != null ? getActivity() : getContext();
    Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    context.startActivity(intent);
    call.resolve();
  }

  @PluginMethod
  public void fillCurrentApp(PluginCall call) {
    String username = call.getString("username", "");
    String password = call.getString("password", "");
    Intent intent = getActivity() != null ? getActivity().getIntent() : null;
    String packageName = intent != null ? intent.getStringExtra(EXTRA_FILL_PACKAGE_NAME) : "";
    boolean ok = GuardianAccessibilityService.requestDeferredFill(packageName, username, password);
    JSObject res = new JSObject();
    res.put("ok", ok);
    call.resolve(res);
    if (ok && getActivity() != null) {
      getActivity().setResult(Activity.RESULT_CANCELED);
      getActivity().finish();
    }
  }

  @PluginMethod
  public void ackPendingSave(PluginCall call) {
    String id = call.getString("id", "");
    boolean ok = PendingAutofillStore.remove(getContext(), id);
    clearPendingSaveIntent(id);
    Log.i(TAG, "ackPendingSave id=" + id + " ok=" + ok);
    JSObject res = new JSObject();
    res.put("ok", ok);
    call.resolve(res);
  }

  @PluginMethod
  public void completeFill(PluginCall call) {
    String username = call.getString("username", "");
    String password = call.getString("password", "");
    String label = call.getString("label", "");
    Activity activity = getActivity();
    if (activity == null) {
      call.reject("No host activity.");
      return;
    }
    if (TextUtils.isEmpty(password)) {
      call.reject("Password is required.");
      return;
    }

    Intent sourceIntent = activity.getIntent();
    AutofillId usernameId = getAutofillIdExtra(sourceIntent, EXTRA_FILL_USERNAME_ID);
    AutofillId passwordId = getAutofillIdExtra(sourceIntent, EXTRA_FILL_PASSWORD_ID);
    if (passwordId == null) {
      call.reject("No password field found for this autofill request.");
      return;
    }

    String datasetLabel = !TextUtils.isEmpty(label)
      ? label
      : (!TextUtils.isEmpty(username) ? username : "Guardian login");
    RemoteViews presentation = createSingleLinePresentation(getContext(), datasetLabel);

    Dataset.Builder dataset = new Dataset.Builder(presentation);
    if (usernameId != null && !TextUtils.isEmpty(username)) {
      dataset.setValue(usernameId, AutofillValue.forText(username), presentation);
    }
    dataset.setValue(passwordId, AutofillValue.forText(password), presentation);

    Intent result = new Intent();
    result.putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, dataset.build());
    result.putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT_EPHEMERAL_DATASET, true);
    activity.setResult(Activity.RESULT_OK, result);
    activity.finish();

    JSObject res = new JSObject();
    res.put("ok", true);
    call.resolve(res);
  }

  @PluginMethod
  public void completeFillResponse(PluginCall call) {
    JSArray entries = call.getArray("entries");
    Activity activity = getActivity();
    if (activity == null) {
      call.reject("No host activity.");
      return;
    }
    if (entries == null || entries.length() == 0) {
      call.reject("At least one autofill entry is required.");
      return;
    }

    Intent sourceIntent = activity.getIntent();
    AutofillId usernameId = getAutofillIdExtra(sourceIntent, EXTRA_FILL_USERNAME_ID);
    AutofillId passwordId = getAutofillIdExtra(sourceIntent, EXTRA_FILL_PASSWORD_ID);
    if (passwordId == null) {
      call.reject("No password field found for this autofill request.");
      return;
    }

    FillResponse.Builder response = new FillResponse.Builder();
    for (int i = 0; i < entries.length(); i++) {
      JSONObject entry = entries.optJSONObject(i);
      if (entry == null) continue;
      String username = entry.optString("username", "");
      String password = entry.optString("password", "");
      String label = entry.optString("label", "");
      if (TextUtils.isEmpty(password)) continue;

      String datasetLabel = !TextUtils.isEmpty(label)
        ? label
        : (!TextUtils.isEmpty(username) ? username : "Guardian login");
      RemoteViews presentation = createSingleLinePresentation(getContext(), datasetLabel);
      Dataset.Builder dataset = new Dataset.Builder(presentation);
      if (usernameId != null) {
        if (!TextUtils.isEmpty(username)) {
          dataset.setValue(usernameId, AutofillValue.forText(username), presentation);
        } else {
          dataset.setValue(usernameId, null, presentation);
        }
      }
      dataset.setValue(passwordId, AutofillValue.forText(password), presentation);
      response.addDataset(dataset.build());
    }

    Intent result = new Intent();
    result.putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, response.build());
    activity.setResult(Activity.RESULT_OK, result);
    activity.finish();

    JSObject res = new JSObject();
    res.put("ok", true);
    call.resolve(res);
  }

  @PluginMethod
  public void cancelFill(PluginCall call) {
    Activity activity = getActivity();
    if (activity != null) {
      activity.setResult(Activity.RESULT_CANCELED);
      activity.finish();
    }
    JSObject res = new JSObject();
    res.put("ok", true);
    call.resolve(res);
  }

  @PluginMethod
  public void clearPendingSave(PluginCall call) {
    String id = call.getString("id", "");
    if (!TextUtils.isEmpty(id)) {
      boolean ok = PendingAutofillStore.remove(getContext(), id);
      clearPendingSaveIntent(id);
      Log.i(TAG, "clearPendingSave(id) id=" + id + " ok=" + ok);
      JSObject res = new JSObject();
      res.put("ok", ok);
      call.resolve(res);
      return;
    }

    PendingAutofillStore.clearAll(getContext());
    clearPendingSaveIntent(null);
    Log.i(TAG, "clearPendingSave(all) ok=true");
    JSObject res = new JSObject();
    res.put("ok", true);
    call.resolve(res);
  }

  private JSObject getPendingSaveFromIntent() {
    Activity activity = getActivity();
    Intent intent = activity != null ? activity.getIntent() : null;
    if (intent == null) return null;
    String flow = intent.getStringExtra(EXTRA_AUTOFILL_FLOW);
    if (!AUTOFILL_FLOW_SAVE.equals(flow)) return null;

    String id = intent.getStringExtra(EXTRA_SAVE_ID);
    String password = intent.getStringExtra(EXTRA_SAVE_PASSWORD);
    if (TextUtils.isEmpty(id) || TextUtils.isEmpty(password)) return null;

    JSObject pending = new JSObject();
    pending.put("id", id);
    pending.put("username", intent.getStringExtra(EXTRA_SAVE_USERNAME));
    pending.put("password", password);
    pending.put("packageName", intent.getStringExtra(EXTRA_SAVE_PACKAGE_NAME));
    pending.put("appLabel", intent.getStringExtra(EXTRA_SAVE_APP_LABEL));
    pending.put("appIconDataUrl", intent.getStringExtra(EXTRA_SAVE_APP_ICON_DATA_URL));
    pending.put("timestampMs", intent.getLongExtra(EXTRA_SAVE_TIMESTAMP_MS, 0));
    return pending;
  }

  private void clearPendingSaveIntent(String id) {
    Activity activity = getActivity();
    Intent intent = activity != null ? activity.getIntent() : null;
    if (intent == null) return;
    String flow = intent.getStringExtra(EXTRA_AUTOFILL_FLOW);
    if (!AUTOFILL_FLOW_SAVE.equals(flow)) return;
    if (!TextUtils.isEmpty(id)) {
      String intentId = intent.getStringExtra(EXTRA_SAVE_ID);
      if (!id.equals(intentId)) return;
    }

    intent.removeExtra(EXTRA_AUTOFILL_FLOW);
    intent.removeExtra(EXTRA_SAVE_ID);
    intent.removeExtra(EXTRA_SAVE_USERNAME);
    intent.removeExtra(EXTRA_SAVE_PASSWORD);
    intent.removeExtra(EXTRA_SAVE_PACKAGE_NAME);
    intent.removeExtra(EXTRA_SAVE_APP_LABEL);
    intent.removeExtra(EXTRA_SAVE_APP_ICON_DATA_URL);
    intent.removeExtra(EXTRA_SAVE_TIMESTAMP_MS);
    activity.setIntent(intent);
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

  @PluginMethod
  public void setAutofillPresentationTheme(PluginCall call) {
    String theme = call.getString("theme", "dark");
    SharedPreferences prefs = getContext().getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    prefs.edit().putString(KEY_PRESENTATION_THEME, theme).apply();
    JSObject res = new JSObject();
    res.put("ok", true);
    call.resolve(res);
  }

  static RemoteViews createSingleLinePresentation(Context context, String text) {
    RemoteViews views = new RemoteViews("com.guardian.vault", R.layout.autofill_suggestion_chip);
    String theme = getAutofillPresentationTheme(context);
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

  @SuppressWarnings("deprecation")
  private static AutofillId getAutofillIdExtra(Intent intent, String key) {
    if (intent == null) return null;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return intent.getParcelableExtra(key, AutofillId.class);
    }
    return intent.getParcelableExtra(key);
  }
}
