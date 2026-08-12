import type { PluginListenerHandle } from "@capacitor/core";
import { registerPlugin } from "@capacitor/core";

export type PendingAutofillSave = {
  id: string;
  username?: string;
  password: string;
  packageName?: string;
  appLabel?: string;
  appIconDataUrl?: string;
  timestampMs?: number;
};

export type PendingAutofillFillRequest = {
  packageName?: string;
  appLabel?: string;
  hasUsernameField: boolean;
  hasPasswordField: boolean;
};

export type AutofillLaunchContext = {
  inlineAuth: boolean;
  activity: string;
};

export type AccessibilityStatus = {
  enabled: boolean;
};

export interface AutofillBridgePlugin {
  getPendingSave(): Promise<{ pending: PendingAutofillSave | null }>;
  getFillRequest(): Promise<{ request: PendingAutofillFillRequest | null }>;
  getAccessibilityStatus(): Promise<AccessibilityStatus>;
  openAccessibilitySettings(): Promise<void>;
  fillCurrentApp(options: { username?: string; password: string }): Promise<{ ok: boolean }>;
  ackPendingSave(options: { id: string }): Promise<{ ok: boolean }>;
  clearPendingSave(options: { id: string }): Promise<{ ok: boolean }>;
  completeFill(options: { username?: string; password: string; label?: string }): Promise<{ ok: boolean }>;
  completeFillResponse(options: { entries: Array<{ username?: string; password: string; label: string }> }): Promise<{ ok: boolean }>;
  cancelFill(): Promise<{ ok: boolean }>;
  setAutofillPresentationTheme(options: { theme: string }): Promise<{ ok: boolean }>;
  getLaunchContext(): Promise<AutofillLaunchContext>;
  finishHostActivity(): Promise<void>;
  openMainApp(): Promise<void>;
  setInlineAutofillServerMode(options: { enabled: boolean }): Promise<{ ok: boolean }>;
  addListener(
    eventName: "pendingSave",
    listenerFunc: (data: { pending: PendingAutofillSave }) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  removeAllListeners(): Promise<void>;
}

export const AutofillBridge = registerPlugin<AutofillBridgePlugin>("AutofillBridge");
