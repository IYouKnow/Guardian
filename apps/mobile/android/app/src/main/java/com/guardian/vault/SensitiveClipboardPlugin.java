package com.guardian.vault;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Build;
import android.content.ClipDescription;
import android.os.Handler;
import android.os.Looper;
import android.os.PersistableBundle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "SensitiveClipboard")
public class SensitiveClipboardPlugin extends Plugin {
  @PluginMethod
  public void copy(PluginCall call) {
    String text = call.getString("text", "");
    String label = call.getString("label", "Guardian");
    Boolean sensitive = call.getBoolean("sensitive", false);
    Integer clearAfterMs = call.getInt("clearAfterMs", 0);

    if (text == null || text.length() == 0) {
      JSObject res = new JSObject();
      res.put("ok", false);
      call.resolve(res);
      return;
    }

    ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
    if (clipboard == null) {
      JSObject res = new JSObject();
      res.put("ok", false);
      call.resolve(res);
      return;
    }

    ClipData clip;
    if (Boolean.TRUE.equals(sensitive) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ClipDescription description = new ClipDescription(label, new String[] { ClipDescription.MIMETYPE_TEXT_PLAIN });
      try {
        PersistableBundle extras = new PersistableBundle();
        // EXTRA_IS_SENSITIVE is API 33+. Keep the literal for robustness across OEM changes.
        extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
        extras.putBoolean("android.content.extra.IS_SENSITIVE", true);
        description.setExtras(extras);
      } catch (Exception ignored) {
        // Best-effort; continue without sensitive flag.
      }
      clip = new ClipData(description, new ClipData.Item(text));
    } else {
      clip = ClipData.newPlainText(label, text);
    }

    clipboard.setPrimaryClip(clip);

    if (Boolean.TRUE.equals(sensitive) && clearAfterMs != null && clearAfterMs > 0) {
      int delayMs = Math.max(1000, Math.min(clearAfterMs, 5 * 60 * 1000));
      Handler handler = new Handler(Looper.getMainLooper());
      final boolean[] cancelled = new boolean[] { false };
      final Runnable[] clearRunnable = new Runnable[1];
      final ClipboardManager.OnPrimaryClipChangedListener[] listener = new ClipboardManager.OnPrimaryClipChangedListener[1];

      listener[0] = () -> {
        if (cancelled[0]) return;
        cancelled[0] = true;
        if (clearRunnable[0] != null) handler.removeCallbacks(clearRunnable[0]);
        try {
          clipboard.removePrimaryClipChangedListener(listener[0]);
        } catch (Exception ignored) {
        }
      };

      clearRunnable[0] = () -> {
        if (cancelled[0]) return;
        cancelled[0] = true;
        try {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            clipboard.clearPrimaryClip();
          } else {
            clipboard.setPrimaryClip(ClipData.newPlainText("", ""));
          }
        } catch (Exception ignored) {
        }
        try {
          clipboard.removePrimaryClipChangedListener(listener[0]);
        } catch (Exception ignored) {
        }
      };

      try {
        clipboard.addPrimaryClipChangedListener(listener[0]);
      } catch (Exception ignored) {
      }
      handler.postDelayed(clearRunnable[0], delayMs);
    }

    JSObject res = new JSObject();
    res.put("ok", true);
    call.resolve(res);
  }
}
