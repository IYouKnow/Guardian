import type { Theme, AccentColor } from "@guardian/shared/themes";
import { getAccentColorClasses } from "@guardian/shared/themes";
import { getThemeClasses } from "../utils/theme";

interface SettingsProps {
  onBack: () => void;
  onLogout: () => void;
  connectionMode: "local" | "server";
  theme: Theme;
  accentColor: AccentColor;
  themeSyncMode: "off" | "follow" | "sync";
  onThemeChange: (theme: Theme) => void;
  onAccentColorChange: (color: AccentColor) => void;
  onThemeSyncModeChange: (mode: "off" | "follow" | "sync") => void;
}

const THEMES: Theme[] = ["system", "dark", "slate", "light", "editor", "violet"];
const ACCENTS: AccentColor[] = ["yellow", "blue", "green", "purple", "pink", "orange", "cyan", "red", "black"];

export default function Settings({
  onBack,
  onLogout,
  connectionMode,
  theme,
  accentColor,
  themeSyncMode,
  onThemeChange,
  onAccentColorChange,
  onThemeSyncModeChange,
}: SettingsProps) {
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);
  const themeLocked = connectionMode === "server" && themeSyncMode === "follow";

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
