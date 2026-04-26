import type { PluginListenerHandle } from "@capacitor/core";
import { registerPlugin } from "@capacitor/core";

export type PendingAutofillSave = {
  id: string;
  username?: string;
  password: string;
  packageName?: string;
  appLabel?: string;
  timestampMs?: number;
};

export type AutofillLaunchContext = {
  inlineAuth: boolean;
  activity: string;
};

export interface AutofillBridgePlugin {
  getPendingSave(): Promise<{ pending: PendingAutofillSave | null }>;
  ackPendingSave(options: { id: string }): Promise<{ ok: boolean }>;
  clearPendingSave(options: { id: string }): Promise<{ ok: boolean }>;
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
