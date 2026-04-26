import { useState } from "react";
import type { Theme, AccentColor } from "@guardian/shared/themes";
import { getAccentColorClasses } from "@guardian/shared/themes";
import { getThemeClasses } from "../utils/theme";

interface SettingsProps {
  onBack: () => void;
  onLogout: () => void;
  connectionMode: "local" | "server";
  biometricAvailable: boolean;
  biometricTypeLabel: string;
  biometricAvailabilityDetail: string;
  biometricLocalEnabled: boolean;
  biometricServerEnabled: boolean;
  onBiometricLocalEnabledChange: (enabled: boolean) => void;
  onEnableBiometricServer: (accountPassword: string) => Promise<void>;
  onDisableBiometricServer: () => Promise<void>;
  serverUrl: string;
  serverUsername: string;
  theme: Theme;
  accentColor: AccentColor;
  themeSyncMode: "off" | "follow" | "sync";
  onThemeChange: (theme: Theme) => void;
  onAccentColorChange: (color: AccentColor) => void;
  onThemeSyncModeChange: (mode: "off" | "follow" | "sync") => void;
  itemSize: "small" | "medium" | "large";
  onItemSizeChange: (size: "small" | "medium" | "large") => void;
}

const THEMES: Theme[] = ["system", "dark", "slate", "light", "editor", "violet"];
const ACCENTS: AccentColor[] = ["yellow", "blue", "green", "purple", "pink", "orange", "cyan", "red", "black"];

export default function Settings({
  onBack,
  onLogout,
  connectionMode,
  biometricAvailable,
  biometricTypeLabel,
  biometricAvailabilityDetail,
  biometricLocalEnabled,
  biometricServerEnabled,
  onBiometricLocalEnabledChange,
  onEnableBiometricServer,
  onDisableBiometricServer,
  serverUrl,
  serverUsername,
  theme,
  accentColor,
  themeSyncMode,
  onThemeChange,
  onAccentColorChange,
  onThemeSyncModeChange,
  itemSize,
  onItemSizeChange,
}: SettingsProps) {
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);
  const themeLocked = connectionMode === "server" && themeSyncMode === "follow";
  const [serverPassword, setServerPassword] = useState("");
  const [serverBiometricPending, setServerBiometricPending] = useState(false);
  const [serverBiometricError, setServerBiometricError] = useState("");
  const [serverBiometricSaving, setServerBiometricSaving] = useState(false);

  const canUseBiometrics = biometricAvailable;
  const localToggleDisabled = connectionMode !== "local" || !canUseBiometrics;
  const serverToggleDisabled = connectionMode !== "server" || !canUseBiometrics;

  return (
    <div className={`flex flex-col h-full ${themeClasses.bg} ${themeClasses.text}`}>
      <div className={`flex items-center gap-4 px-4 pb-4 pt-12 border-b ${themeClasses.border}`}>
        <button
          onClick={onBack}
          className={`p-2 rounded-xl ${themeClasses.hoverBg} ${themeClasses.textSecondary} active:scale-95 transition-all`}
          title="Back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-xl font-bold">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="space-y-4">
          <div className={`${themeClasses.card} border ${themeClasses.border} rounded-2xl p-4 shadow-sm`}>
            <h3 className="font-semibold mb-3">Security</h3>
            <div className="space-y-3">
              {!biometricAvailable && (
                <div className={`text-xs ${themeClasses.textMuted} px-1`}>
                  <p>Biometrics not available.</p>
                  <p className="mt-1">
                    {biometricAvailabilityDetail || "Make sure you are running the installed app (not the browser), and that the device has a screen lock + biometrics enrolled."}
                  </p>
                </div>
              )}
              {connectionMode === "local" && (
                <button
                  onClick={() => onBiometricLocalEnabledChange(!biometricLocalEnabled)}
                  disabled={localToggleDisabled}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                    biometricLocalEnabled
                      ? `${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} border`
                      : `${themeClasses.border} ${themeClasses.textSecondary} hover:${themeClasses.text}`
                  } ${localToggleDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Biometric unlock</p>
                      <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                        {biometricAvailable
                          ? `Unlock your local vault with ${biometricTypeLabel}.`
                          : "Biometrics not available on this device."}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 w-11 h-6 rounded-full border transition-all ${
                        biometricLocalEnabled ? `${accentClasses.bgClass} ${accentClasses.borderClass}` : `${themeClasses.border} bg-transparent`
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          biometricLocalEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                        } mt-0.5`}
                      />
                    </div>
                  </div>
                </button>
              )}

              {connectionMode === "server" && (
                <button
                  onClick={async () => {
                    setServerBiometricError("");
                    if (biometricServerEnabled) {
                      try {
                        setServerBiometricSaving(true);
                        await onDisableBiometricServer();
                      } catch (err) {
                        setServerBiometricError(err instanceof Error ? err.message : "Failed to disable biometrics");
                      } finally {
                        setServerBiometricSaving(false);
                      }
                      return;
                    }
                    setServerBiometricPending(true);
                  }}
                  disabled={serverToggleDisabled || serverBiometricSaving}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                    biometricServerEnabled
                      ? `${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} border`
                      : `${themeClasses.border} ${themeClasses.textSecondary} hover:${themeClasses.text}`
                  } ${(serverToggleDisabled || serverBiometricSaving) ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Biometric sign-in</p>
                      <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                        {biometricAvailable
                          ? `Sign in to ${serverUrl.replace(/^https?:\/\//, "")} as ${serverUsername || "your account"} using ${biometricTypeLabel}.`
                          : "Biometrics not available on this device."}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 w-11 h-6 rounded-full border transition-all ${
                        biometricServerEnabled ? `${accentClasses.bgClass} ${accentClasses.borderClass}` : `${themeClasses.border} bg-transparent`
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          biometricServerEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                        } mt-0.5`}
                      />
                    </div>
                  </div>
                </button>
              )}

              {connectionMode === "server" && serverBiometricPending && !biometricServerEnabled && (
                <div className={`rounded-2xl border ${themeClasses.border} p-3`}>
                  <p className={`text-xs ${themeClasses.textMuted} mb-2`}>
                    Enter your account password once to store it securely (protected by biometrics).
                  </p>
                  <input
                    type="password"
                    value={serverPassword}
                    onChange={(e) => setServerPassword(e.target.value)}
                    placeholder="Account password"
                    className={`w-full bg-transparent outline-none text-base px-3 py-2 rounded-xl border ${themeClasses.border}`}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        setServerBiometricError("");
                        try {
                          setServerBiometricSaving(true);
                          await onEnableBiometricServer(serverPassword);
                          setServerPassword("");
                          setServerBiometricPending(false);
                        } catch (err) {
                          setServerBiometricError(err instanceof Error ? err.message : "Failed to enable biometrics");
                        } finally {
                          setServerBiometricSaving(false);
                        }
                      }}
                      disabled={serverBiometricSaving || serverPassword.length < 8}
                      className={`flex-1 rounded-xl ${accentClasses.bgClass} ${accentClasses.onContrastClass} py-2.5 font-semibold disabled:opacity-50`}
                    >
                      {serverBiometricSaving ? "Enabling..." : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setServerBiometricPending(false);
                        setServerPassword("");
                        setServerBiometricError("");
                      }}
                      disabled={serverBiometricSaving}
                      className={`flex-1 rounded-xl border ${themeClasses.border} py-2.5 font-semibold`}
                    >
                      Cancel
                    </button>
                  </div>
                  {serverBiometricError && (
                    <p className="mt-2 text-xs text-red-400">{serverBiometricError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={`${themeClasses.card} border ${themeClasses.border} rounded-2xl p-4 shadow-sm ${themeLocked ? "opacity-60" : ""}`}>
            <h3 className="font-semibold mb-3">Theme</h3>
            <div className="space-y-2">
              {THEMES.map((t) => {
                const selected = t === theme;
                return (
                  <button
                    key={t}
                    onClick={() => onThemeChange(t)}
                    disabled={themeLocked}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all border ${
                      selected
                        ? `${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} border`
                        : `${themeClasses.border} ${themeClasses.textSecondary} hover:${themeClasses.text}`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {t === "system" ? "System" : t.charAt(0).toUpperCase() + t.slice(1)}
                      </span>
                      {selected && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${themeClasses.card} border ${themeClasses.border} rounded-2xl p-4 shadow-sm ${themeLocked ? "opacity-60" : ""}`}>
            <h3 className="font-semibold mb-3">Accent</h3>
            <div className="grid grid-cols-3 gap-2">
              {ACCENTS.map((c) => {
                const a = getAccentColorClasses(c, theme);
                const selected = c === accentColor;
                return (
                  <button
                    key={c}
                    onClick={() => onAccentColorChange(c)}
                    disabled={themeLocked}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all ${
                      selected ? `${a.borderClass} ring-2 ${a.focusRingClass}` : themeClasses.border
                    } ${themeClasses.hoverBg}`}
                    title={c}
                  >
                    <span className="text-sm font-semibold">{c.charAt(0).toUpperCase() + c.slice(1)}</span>
                    <span className={`w-4 h-4 rounded-md ${a.bgClass}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${themeClasses.card} border ${themeClasses.border} rounded-2xl p-4 shadow-sm`}>
            <h3 className="font-semibold mb-3">Layout</h3>
            <div className="space-y-2">
              <p className={`text-xs ${themeClasses.textMuted} px-1`}>Interface density</p>
              <div className={`flex p-1 rounded-xl ${themeClasses.inputBg} border ${themeClasses.border} shadow-inner overflow-hidden`}>
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => onItemSizeChange(size)}
                    className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                      itemSize === size
                        ? `${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} border shadow-sm`
                        : `${themeClasses.textSecondary} opacity-70 hover:opacity-100`
                    }`}
                    aria-label={`Interface density: ${size}`}
                    title={size}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {connectionMode === "server" && (
            <div className={`${themeClasses.card} border ${themeClasses.border} rounded-2xl p-4 shadow-sm`}>
              <h3 className="font-semibold mb-3">Sync</h3>
              <div className="space-y-2">
                <button
                  onClick={() => onThemeSyncModeChange("off")}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                    themeSyncMode === "off"
                      ? `${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} border`
                      : `${themeClasses.border} ${themeClasses.textSecondary} hover:${themeClasses.text}`
                  }`}
                >
                  <p className="text-sm font-semibold">Off</p>
                  <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>Keep theme local to this device.</p>
                </button>

                <button
                  onClick={() => onThemeSyncModeChange("follow")}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                    themeSyncMode === "follow"
                      ? `${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} border`
                      : `${themeClasses.border} ${themeClasses.textSecondary} hover:${themeClasses.text}`
                  }`}
                >
                  <p className="text-sm font-semibold">Follow server (locked)</p>
                  <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>Always use server theme + accent; disable edits here.</p>
                </button>

                <button
                  onClick={() => onThemeSyncModeChange("sync")}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                    themeSyncMode === "sync"
                      ? `${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} border`
                      : `${themeClasses.border} ${themeClasses.textSecondary} hover:${themeClasses.text}`
                  }`}
                >
                  <p className="text-sm font-semibold">Sync (two-way)</p>
                  <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>Edits here update the server and other devices.</p>
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-2xl py-3 px-4 font-semibold transition-all active:scale-[0.99]"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
