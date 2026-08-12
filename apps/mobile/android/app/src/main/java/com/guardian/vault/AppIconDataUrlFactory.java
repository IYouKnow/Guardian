package com.guardian.vault;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.text.TextUtils;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

final class AppIconDataUrlFactory {
  private static final int ICON_SIZE_PX = 32;
  private static final Set<String> GENERIC_PACKAGE_SEGMENTS = new LinkedHashSet<>();

  static {
    GENERIC_PACKAGE_SEGMENTS.add("app");
    GENERIC_PACKAGE_SEGMENTS.add("apps");
    GENERIC_PACKAGE_SEGMENTS.add("android");
    GENERIC_PACKAGE_SEGMENTS.add("mobile");
    GENERIC_PACKAGE_SEGMENTS.add("release");
    GENERIC_PACKAGE_SEGMENTS.add("debug");
    GENERIC_PACKAGE_SEGMENTS.add("prod");
    GENERIC_PACKAGE_SEGMENTS.add("production");
    GENERIC_PACKAGE_SEGMENTS.add("staging");
    GENERIC_PACKAGE_SEGMENTS.add("beta");
    GENERIC_PACKAGE_SEGMENTS.add("alpha");
    GENERIC_PACKAGE_SEGMENTS.add("dev");
    GENERIC_PACKAGE_SEGMENTS.add("qa");
    GENERIC_PACKAGE_SEGMENTS.add("pt");
    GENERIC_PACKAGE_SEGMENTS.add("com");
  }

  private AppIconDataUrlFactory() {
  }

  static String create(Drawable drawable, String appLabel, String packageName) {
    Bitmap bitmap = drawableToBitmap(drawable);
    if (bitmap == null) {
      bitmap = generateFallbackBitmap(appLabel, packageName);
    } else if (bitmap.getWidth() != ICON_SIZE_PX || bitmap.getHeight() != ICON_SIZE_PX) {
      bitmap = Bitmap.createScaledBitmap(bitmap, ICON_SIZE_PX, ICON_SIZE_PX, true);
    }
    return bitmapToDataUrl(bitmap);
  }

  private static Bitmap drawableToBitmap(Drawable drawable) {
    if (drawable == null) return null;

    try {
      if (drawable instanceof BitmapDrawable && ((BitmapDrawable) drawable).getBitmap() != null) {
        return ((BitmapDrawable) drawable).getBitmap();
      }

      int width = Math.max(1, drawable.getIntrinsicWidth());
      int height = Math.max(1, drawable.getIntrinsicHeight());
      Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
      Canvas canvas = new Canvas(bitmap);
      drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
      drawable.draw(canvas);
      return bitmap;
    } catch (Exception ignored) {
      return null;
    }
  }

  private static Bitmap generateFallbackBitmap(String appLabel, String packageName) {
    Bitmap bitmap = Bitmap.createBitmap(ICON_SIZE_PX, ICON_SIZE_PX, Bitmap.Config.ARGB_8888);
    Canvas canvas = new Canvas(bitmap);

    String seed = !TextUtils.isEmpty(appLabel) ? appLabel : packageName;
    int[] colors = gradientForSeed(seed);

    Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    bgPaint.setShader(new LinearGradient(
      0,
      0,
      ICON_SIZE_PX,
      ICON_SIZE_PX,
      colors[0],
      colors[1],
      Shader.TileMode.CLAMP
    ));
    float radius = ICON_SIZE_PX * 0.24f;
    canvas.drawRoundRect(new RectF(0, 0, ICON_SIZE_PX, ICON_SIZE_PX), radius, radius, bgPaint);

    String glyph = initialsFor(appLabel, packageName);
    Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    textPaint.setColor(Color.WHITE);
    textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
    textPaint.setTextAlign(Paint.Align.CENTER);
    textPaint.setTextSize(glyph.length() > 1 ? ICON_SIZE_PX * 0.36f : ICON_SIZE_PX * 0.46f);

    Rect textBounds = new Rect();
    textPaint.getTextBounds(glyph, 0, glyph.length(), textBounds);
    float x = ICON_SIZE_PX / 2f;
    float y = (ICON_SIZE_PX / 2f) - textBounds.exactCenterY();
    canvas.drawText(glyph, x, y, textPaint);

    return bitmap;
  }

  private static String initialsFor(String appLabel, String packageName) {
    String label = !TextUtils.isEmpty(appLabel) ? appLabel.trim() : fallbackTitleFromPackageName(packageName);
    if (TextUtils.isEmpty(label)) return "A";

    String[] words = label.split("[\\s._-]+");
    StringBuilder initials = new StringBuilder();
    for (String word : words) {
      if (TextUtils.isEmpty(word)) continue;
      char ch = word.charAt(0);
      if (Character.isLetterOrDigit(ch)) {
        initials.append(Character.toUpperCase(ch));
      }
      if (initials.length() >= 2) break;
    }

    if (initials.length() > 0) {
      return initials.toString();
    }

    return label.substring(0, 1).toUpperCase(Locale.ROOT);
  }

  private static String fallbackTitleFromPackageName(String packageName) {
    if (TextUtils.isEmpty(packageName)) return "";

    String[] segments = packageName.trim().split("\\.");
    for (int i = segments.length - 1; i >= 0; i--) {
      String part = segments[i] != null ? segments[i].trim() : "";
      if (TextUtils.isEmpty(part)) continue;
      String lower = part.toLowerCase(Locale.ROOT);
      if (GENERIC_PACKAGE_SEGMENTS.contains(lower)) continue;
      if (!part.matches(".*[a-zA-Z].*")) continue;

      String spaced = part.replaceAll("[-_]+", " ").replaceAll("([a-z0-9])([A-Z])", "$1 $2").trim();
      if (TextUtils.isEmpty(spaced)) continue;

      String[] words = spaced.split("\\s+");
      if (words.length == 1 && words[0].matches("^[a-zA-Z0-9]{2,5}$")) {
        return words[0].toUpperCase(Locale.ROOT);
      }

      StringBuilder title = new StringBuilder();
      for (String word : words) {
        if (TextUtils.isEmpty(word)) continue;
        if (title.length() > 0) title.append(' ');
        title.append(Character.toUpperCase(word.charAt(0)));
        if (word.length() > 1) {
          title.append(word.substring(1));
        }
      }
      return title.toString();
    }

    return "";
  }

  private static int[] gradientForSeed(String seed) {
    int hash = TextUtils.isEmpty(seed) ? 0x5A17 : seed.hashCode();
    float hueA = Math.floorMod(hash, 360);
    float hueB = (hueA + 38f + Math.abs(hash % 67)) % 360f;
    int start = Color.HSVToColor(new float[] { hueA, 0.62f, 0.84f });
    int end = Color.HSVToColor(new float[] { hueB, 0.70f, 0.98f });
    return new int[] { start, end };
  }

  private static String bitmapToDataUrl(Bitmap bitmap) {
    if (bitmap == null) return "";

    try {
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, output);
      String base64 = Base64.getEncoder().encodeToString(output.toByteArray());
      return "data:image/png;base64," + base64;
    } catch (Exception ignored) {
      return "";
    }
  }
}
