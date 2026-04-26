import { registerPlugin } from "@capacitor/core";

export type PendingAutofillSave = {
  username?: string;
  password: string;
  packageName?: string;
  appLabel?: string;
  timestampMs?: number;
};

export interface AutofillBridgePlugin {
  getPendingSave(): Promise<{ pending: PendingAutofillSave | null }>;
  clearPendingSave(): Promise<{ ok: boolean }>;
}

export const AutofillBridge = registerPlugin<AutofillBridgePlugin>("AutofillBridge");
