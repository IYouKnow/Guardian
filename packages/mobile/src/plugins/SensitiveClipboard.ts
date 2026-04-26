import { registerPlugin } from "@capacitor/core";

export interface SensitiveClipboardPlugin {
  copy(options: {
    text: string;
    label?: string;
    sensitive?: boolean;
    /**
     * Best-effort clipboard auto-clear (Android). May be ignored on some devices.
     */
    clearAfterMs?: number;
  }): Promise<{ ok: boolean }>;
}

export const SensitiveClipboard = registerPlugin<SensitiveClipboardPlugin>("SensitiveClipboard");
