package com.guardian.vault;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;
import android.util.Log;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.UUID;

public final class PendingAutofillStore {
  private static final String TAG = "PendingAutofillStore";
  public static final String ACTION_PENDING_SAVE_ADDED = "com.guardian.vault.PENDING_SAVE_ADDED";
  public static final String EXTRA_ID = "id";

  private static final String PREFS_NAME_V2_ENC = "guardian_autofill_pending_save_v2_enc";
  private static final String PREFS_NAME_V2_PLAIN = "guardian_autofill_pending_save_v2_plain";
  private static final String KEY_QUEUE = "queue";

  // Legacy v1 (plain SharedPreferences; single slot).
  private static final String LEGACY_PREFS = "guardian_autofill_pending_save";
  private static final String LEGACY_KEY_USERNAME = "username";
  private static final String LEGACY_KEY_PASSWORD = "password";
  private static final String LEGACY_KEY_PACKAGE = "packageName";
  private static final String LEGACY_KEY_APP_LABEL = "appLabel";
  private static final String LEGACY_KEY_APP_ICON_DATA_URL = "appIconDataUrl";
  private static final String LEGACY_KEY_TS = "timestampMs";

  private static final Object LOCK = new Object();

  public static final class Item {
    public final String id;
    public final String username;
    public final String password;
    public final String packageName;
    public final String appLabel;
    public final String appIconDataUrl;
    public final long timestampMs;

    Item(String id, String username, String password, String packageName, String appLabel, String appIconDataUrl, long timestampMs) {
      this.id = id;
      this.username = username;
      this.password = password;
      this.packageName = packageName;
      this.appLabel = appLabel;
      this.appIconDataUrl = appIconDataUrl;
      this.timestampMs = timestampMs;
    }

    JSONObject toJson() {
      JSONObject o = new JSONObject();
      try {
        o.put("id", id);
        o.put("username", username);
        o.put("password", password);
        o.put("packageName", packageName);
        o.put("appLabel", appLabel);
        o.put("appIconDataUrl", appIconDataUrl);
        o.put("timestampMs", timestampMs);
      } catch (Exception ignored) {
      }
      return o;
    }

    static Item fromJson(JSONObject o) {
      if (o == null) return null;
      String id = o.optString("id", "");
      String password = o.optString("password", "");
      if (TextUtils.isEmpty(id) || TextUtils.isEmpty(password)) return null;

      return new Item(
        id,
        o.optString("username", ""),
        password,
        o.optString("packageName", ""),
        o.optString("appLabel", ""),
        o.optString("appIconDataUrl", ""),
        o.optLong("timestampMs", 0)
      );
    }
  }

  private static SharedPreferences getPlainPrefs(Context context) {
    return context.getApplicationContext().getSharedPreferences(PREFS_NAME_V2_PLAIN, Context.MODE_PRIVATE);
  }

  private static SharedPreferences tryGetEncryptedPrefs(Context context) {
    try {
      MasterKey key = new MasterKey.Builder(context.getApplicationContext())
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build();
      return EncryptedSharedPreferences.create(
        context.getApplicationContext(),
        PREFS_NAME_V2_ENC,
        key,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
      );
    } catch (Exception ignored) {
      Log.w(TAG, "EncryptedSharedPreferences unavailable; using plain prefs fallback");
      return null;
    }
  }

  private static void migrateIfNeeded(Context context, SharedPreferences encrypted, SharedPreferences plain) {
    if (encrypted == null) return;
    if (plain == null) return;

    // Legacy v1 -> encrypted
    migrateLegacyIfNeeded(context, encrypted);

    // Plain v2 -> encrypted
    try {
      JSONArray plainQueue = readQueue(plain);
      if (plainQueue.length() < 1) return;

      JSONArray encQueue = readQueue(encrypted);
      for (int i = 0; i < plainQueue.length(); i++) {
        JSONObject o = plainQueue.optJSONObject(i);
        if (o != null) encQueue.put(o);
      }
      encrypted.edit().putString(KEY_QUEUE, encQueue.toString()).apply();
      plain.edit().remove(KEY_QUEUE).apply();
      Log.i(TAG, "migrated plain->encrypted queue items=" + plainQueue.length());
    } catch (Exception ignored) {
      // If migration fails, keep plain data so we can still read it later.
    }
  }

  private static void migrateLegacyIfNeeded(Context context, SharedPreferences target) {
    try {
      SharedPreferences legacy = context.getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE);
      String legacyPassword = legacy.getString(LEGACY_KEY_PASSWORD, "");
      if (TextUtils.isEmpty(legacyPassword)) return;

      Item item = new Item(
        UUID.randomUUID().toString(),
        legacy.getString(LEGACY_KEY_USERNAME, ""),
        legacyPassword,
        legacy.getString(LEGACY_KEY_PACKAGE, ""),
        legacy.getString(LEGACY_KEY_APP_LABEL, ""),
        legacy.getString(LEGACY_KEY_APP_ICON_DATA_URL, ""),
        legacy.getLong(LEGACY_KEY_TS, System.currentTimeMillis())
      );

      JSONArray queue = readQueue(target);
      queue.put(item.toJson());
      target.edit().putString(KEY_QUEUE, queue.toString()).apply();
      legacy.edit().clear().apply();
    } catch (Exception ignored) {
      // Ignore migration failures; worst case the legacy save stays where it is.
    }
  }

  private static JSONArray readQueue(SharedPreferences p) {
    try {
      String raw = p.getString(KEY_QUEUE, "");
      if (TextUtils.isEmpty(raw)) return new JSONArray();
      return new JSONArray(raw);
    } catch (Exception ignored) {
      return new JSONArray();
    }
  }

  public static Item peekNext(Context context) {
    synchronized (LOCK) {
      Context app = context.getApplicationContext();
      SharedPreferences plain = getPlainPrefs(app);
      SharedPreferences enc = tryGetEncryptedPrefs(app);
      migrateIfNeeded(app, enc, plain);

      JSONArray queue = enc != null ? readQueue(enc) : new JSONArray();
      if (queue.length() < 1) {
        queue = readQueue(plain);
      }
      if (queue.length() < 1) return null;
      Item item = Item.fromJson(queue.optJSONObject(0));
      if (item != null) Log.d(TAG, "peekNext -> id=" + item.id + " pkg=" + item.packageName);
      return item;
    }
  }

  public static Item getById(Context context, String id) {
    if (TextUtils.isEmpty(id)) return null;
    synchronized (LOCK) {
      Context app = context.getApplicationContext();
      SharedPreferences plain = getPlainPrefs(app);
      SharedPreferences enc = tryGetEncryptedPrefs(app);
      migrateIfNeeded(app, enc, plain);

      JSONArray queueEnc = enc != null ? readQueue(enc) : new JSONArray();
      JSONArray queuePlain = readQueue(plain);

      for (int i = 0; i < queueEnc.length(); i++) {
        Item item = Item.fromJson(queueEnc.optJSONObject(i));
        if (item != null && id.equals(item.id)) return item;
      }
      for (int i = 0; i < queuePlain.length(); i++) {
        Item item = Item.fromJson(queuePlain.optJSONObject(i));
        if (item != null && id.equals(item.id)) return item;
      }
      return null;
    }
  }

  public static Item add(Context context, String username, String password, String packageName, String appLabel, String appIconDataUrl) {
    if (TextUtils.isEmpty(password)) return null;
    synchronized (LOCK) {
      Context app = context.getApplicationContext();
      SharedPreferences plain = getPlainPrefs(app);
      SharedPreferences enc = tryGetEncryptedPrefs(app);
      migrateIfNeeded(app, enc, plain);

      SharedPreferences target = enc != null ? enc : plain;
      JSONArray queue = readQueue(target);

      Item item = new Item(
        UUID.randomUUID().toString(),
        username != null ? username : "",
        password,
        packageName != null ? packageName : "",
        appLabel != null ? appLabel : "",
        appIconDataUrl != null ? appIconDataUrl : "",
        System.currentTimeMillis()
      );

      queue.put(item.toJson());

      // Basic bound to avoid unbounded growth if the user never unlocks.
      // Keep newest 50.
      while (queue.length() > 50) {
        JSONArray trimmed = new JSONArray();
        for (int i = Math.max(0, queue.length() - 50); i < queue.length(); i++) {
          trimmed.put(queue.optJSONObject(i));
        }
        queue = trimmed;
      }

      target.edit().putString(KEY_QUEUE, queue.toString()).apply();
      Log.i(TAG, "add -> id=" + item.id + " pkg=" + item.packageName + " storedIn=" + (enc != null ? "encrypted" : "plain"));
      return item;
    }
  }

  public static boolean remove(Context context, String id) {
    if (TextUtils.isEmpty(id)) return false;
    synchronized (LOCK) {
      Context app = context.getApplicationContext();
      SharedPreferences plain = getPlainPrefs(app);
      SharedPreferences enc = tryGetEncryptedPrefs(app);
      migrateIfNeeded(app, enc, plain);

      boolean removedEnc = removeFromPrefs(enc, id);
      boolean removedPlain = removeFromPrefs(plain, id);
      return removedEnc || removedPlain;
    }
  }

  public static void clearAll(Context context) {
    synchronized (LOCK) {
      Context app = context.getApplicationContext();
      SharedPreferences plain = getPlainPrefs(app);
      SharedPreferences enc = tryGetEncryptedPrefs(app);
      try {
        if (enc != null) enc.edit().remove(KEY_QUEUE).apply();
      } catch (Exception ignored) {
      }
      plain.edit().remove(KEY_QUEUE).apply();
    }
  }

  private static boolean removeFromPrefs(SharedPreferences p, String id) {
    if (p == null) return false;
    try {
      JSONArray queue = readQueue(p);
      JSONArray next = new JSONArray();
      boolean removed = false;

      for (int i = 0; i < queue.length(); i++) {
        JSONObject o = queue.optJSONObject(i);
        String itemId = o != null ? o.optString("id", "") : "";
        if (!TextUtils.isEmpty(itemId) && itemId.equals(id)) {
          removed = true;
          continue;
        }
        next.put(o);
      }

      SharedPreferences.Editor e = p.edit();
      if (next.length() == 0) e.remove(KEY_QUEUE);
      else e.putString(KEY_QUEUE, next.toString());
      e.apply();
      return removed;
    } catch (Exception ignored) {
      return false;
    }
  }
}
