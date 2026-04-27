package com.guardian.vault;

import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class AutofillAuthActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(SensitiveClipboardPlugin.class);
    registerPlugin(AutofillBridgePlugin.class);
    super.onCreate(savedInstanceState);
    setFinishOnTouchOutside(false);

    Window window = getWindow();
    if (window != null) {
      window.setBackgroundDrawableResource(android.R.color.transparent);
      WindowManager.LayoutParams params = window.getAttributes();
      params.width = ViewGroup.LayoutParams.MATCH_PARENT;
      params.height = ViewGroup.LayoutParams.WRAP_CONTENT;
      params.gravity = Gravity.BOTTOM;
      params.dimAmount = 0.45f;
      window.setAttributes(params);
      window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    View content = findViewById(android.R.id.content);
    if (content instanceof ViewGroup) {
      ViewGroup contentGroup = (ViewGroup) content;
      contentGroup.setMinimumHeight(0);
      contentGroup.post(() -> {
        View child = contentGroup.getChildAt(0);
        if (child == null) return;
        ViewGroup.LayoutParams layoutParams = child.getLayoutParams();
        if (layoutParams == null) return;
        layoutParams.height = ViewGroup.LayoutParams.WRAP_CONTENT;
        child.setLayoutParams(layoutParams);
        child.requestLayout();
      });
    }
  }
}
