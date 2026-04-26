package com.guardian.vault;

import android.app.assist.AssistStructure;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
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
import android.view.View;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

@RequiresApi(api = Build.VERSION_CODES.O)
public class GuardianAutofillService extends AutofillService {
  static final String PREFS = "guardian_autofill_pending_save";
  static final String KEY_USERNAME = "username";
  static final String KEY_PASSWORD = "password";
  static final String KEY_PACKAGE = "packageName";
  static final String KEY_APP_LABEL = "appLabel";
  static final String KEY_TS = "timestampMs";

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

      SaveInfo saveInfo = new SaveInfo.Builder(SaveInfo.SAVE_DATA_TYPE_PASSWORD, requiredIds.toArray(new AutofillId[0]))
        .setDescription("Save to Guardian")
        .build();

      FillResponse response = new FillResponse.Builder().setSaveInfo(saveInfo).build();
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

      AutofillStructureParser.ParsedValues values = structure != null
        ? AutofillStructureParser.extractValues(structure)
        : null;

      String username = values != null ? values.username : "";
      String password = values != null ? values.password : "";

      if (!TextUtils.isEmpty(password)) {
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs
          .edit()
          .putString(KEY_USERNAME, username)
          .putString(KEY_PASSWORD, password)
          .putString(KEY_PACKAGE, packageName)
          .putString(KEY_APP_LABEL, appLabel)
          .putLong(KEY_TS, System.currentTimeMillis())
          .apply();

        // Bring Guardian to foreground to prompt the user.
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
      }

      callback.onSuccess();
    } catch (Exception ignored) {
      callback.onFailure("Failed to save");
    }
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
      }

      int count = node.getChildCount();
      for (int i = 0; i < count; i++) traverseForValues(node.getChildAt(i), out);
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
      return variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS;
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
