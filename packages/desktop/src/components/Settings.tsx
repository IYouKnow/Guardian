import { useState } from "react";
import { Theme, AccentColor } from "../types";
import { getThemeClasses, AppearanceSettings, SettingsLayout, SecuritySettings } from "@guardian/shared";
import { getAccentColorClasses } from "../utils/accentColors";
import { motion, AnimatePresence } from "framer-motion";

interface SettingsProps {
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  itemSize: "small" | "medium" | "large";
  onItemSizeChange: (size: "small" | "medium" | "large") => void;
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
  clipboardClearSeconds: number;
  onClipboardClearSecondsChange: (seconds: number) => void;
  revealCensorSeconds: number;
  onRevealCensorSecondsChange: (seconds: number) => void;
  onSync?: () => void;
  onLinkAccount?: () => void;
  miniMode: boolean;
  onMiniModeChange: (enabled: boolean) => void;
  showNotifications: boolean;
  onShowNotificationsChange: (show: boolean) => void;
  themeSyncMode: "off" | "follow" | "sync";
  onThemeSyncModeChange: (mode: "off" | "follow" | "sync") => void;
  connectionMode: "local" | "server";
  appVersion: string;
  updateVersion?: string;
  updating: boolean;
  onUpdate: () => void;
  customFieldTemplates: { name: string; type: string }[];
  onCustomFieldTemplatesChange: (templates: { name: string; type: string }[]) => void;
}

type SettingsSection = "account" | "appearance" | "security" | "fields";

const Icons = {
  Account: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Appearance: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-3M9.707 3.293l-3.414 3.414A2 2 0 006 8.121V11h3a2 2 0 002-2V5a2 2 0 00-2-2 1.99 1.99 0 00-1.293.293z" />
    </svg>
  ),
  Security: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
};

export default function Settings({
  viewMode,
  onViewModeChange,
  theme,
  onThemeChange,
  itemSize,
  onItemSizeChange,
  accentColor,
  onAccentColorChange,
  clipboardClearSeconds,
  onClipboardClearSecondsChange,
  revealCensorSeconds,
  onRevealCensorSecondsChange,
  onSync,
  onLinkAccount,
  miniMode,
  onMiniModeChange,
  showNotifications,
  onShowNotificationsChange,
  themeSyncMode,
  onThemeSyncModeChange,
  connectionMode,
  appVersion,
  updateVersion,
  updating,
  onUpdate,
  customFieldTemplates,
  onCustomFieldTemplatesChange
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);

  const navItems = [
    { id: "account", label: "Account", icon: <Icons.Account /> },
    { id: "appearance", label: "Appearance", icon: <Icons.Appearance /> },
    { id: "fields", label: "Fields", icon: <Icons.Appearance /> },
    { id: "security", label: "Security", icon: <Icons.Security /> },
  ];

  return (
    <SettingsLayout
      title="Settings"
      subtitle="Guardian Vault"
      navItems={navItems}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as SettingsSection)}
      theme={theme}
      accentColor={accentColor}
    >
      <AnimatePresence mode="wait">
        {activeSection === "account" && (
          <motion.div
            key="account"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-12 md:space-y-14"
          >
            <header className="md:hidden mb-8">
              <h1 className="text-2xl font-black tracking-tight uppercase opacity-90">Settings</h1>
            </header>

            <section className="space-y-6">
              <div className={`p-6 rounded-2xl ${themeClasses.sectionBg} border ${themeClasses.border} space-y-6`}>
                <div>
                  <h3 className={`text-lg font-bold ${themeClasses.text} mb-1`}>Vault Status</h3>
                  <p className={`text-sm ${themeClasses.textSecondary}`}>Manage your vault connection and synchronization.</p>
                </div>

                <div className="flex gap-4">
                  {connectionMode === "server" && (
                    <button
                      onClick={onSync}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${themeClasses.activeBg} ${themeClasses.activeText} hover:opacity-90 flex items-center justify-center gap-2`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sync Vault
                    </button>
                  )}
                  {connectionMode === "server" && (
                    <button
                      onClick={onLinkAccount}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${themeClasses.input} ${themeClasses.text} hover:bg-white/10 flex items-center justify-center gap-2`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Link Account
                    </button>
                  )}
                  {connectionMode === "local" && (
                    <div className="flex-1 text-center text-sm opacity-50 italic">
                      Local vaults are managed directly from your device.
                    </div>
                  )}
                </div>

              </div>

              <div className={`p-6 rounded-2xl ${themeClasses.sectionBg} border ${themeClasses.border} flex items-center justify-between`}>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold ${themeClasses.text}`}>Mini Mode</h3>
                  <p className={`text-xs ${themeClasses.textSecondary} mt-1 max-w-xs`}>
                    Compact login window (450×250) for quick access. When enabled, the login screen appears as a small window.
                  </p>
                </div>
                <button
                  onClick={() => onMiniModeChange(!miniMode)}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${miniMode ? accentClasses.bgClass : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${miniMode ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </section>

              <div className={`p-4 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${accentClasses.bgClass}`} />
                    <span className={`text-xs font-semibold ${themeClasses.text}`}>Guardian</span>
                    <span className={`text-xs font-mono ${themeClasses.textMuted}`}>v{appVersion}</span>
                  </div>
                  {updateVersion && (
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${accentClasses.textClass}`}>Update Available</span>
                  )}
                </div>
                {updateVersion && (
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${themeClasses.textSecondary}`}>v{updateVersion} ready to install</span>
                    <button
                      onClick={onUpdate}
                      disabled={updating}
                      className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg ${accentClasses.bgClass} ${accentClasses.onContrastClass} hover:opacity-90 transition-colors disabled:opacity-50`}
                    >
                      {updating ? "Updating..." : "Update"}
                    </button>
                  </div>
                )}
              </div>
          </motion.div>
        )}

        {activeSection === "appearance" && (
          <motion.div
            key="appearance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-12 md:space-y-14"
          >
            <header className="md:hidden mb-8">
              <h1 className="text-2xl font-black tracking-tight uppercase opacity-90">Settings</h1>
            </header>

            <div className={`p-6 rounded-2xl ${themeClasses.sectionBg} border ${themeClasses.border} flex items-center justify-between`}>
              <div>
                <h3 className={`text-sm font-bold ${themeClasses.text}`}>Notifications</h3>
                <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>Show toast notifications for actions</p>
              </div>

              <button
                onClick={() => onShowNotificationsChange(!showNotifications)}
                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${showNotifications ? accentClasses.bgClass : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${showNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <AppearanceSettings
              theme={theme}
              accentColor={accentColor}
              onThemeChange={onThemeChange}
              onAccentColorChange={onAccentColorChange}
              themeSyncMode={connectionMode === "server" ? (themeSyncMode as any) : undefined}
              onThemeSyncModeChange={connectionMode === "server" ? onThemeSyncModeChange : undefined}
            />

            <div className={`h-px w-full ${themeClasses.divider} opacity-40`} />

            {/* Layout and Density */}
            <section className="space-y-10 md:space-y-12">
              <header>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-6 md:mb-8 block ${themeClasses.textTertiary}`}>Data Visualization</label>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-4 md:space-y-5">
                  <label className="text-[10px] md:text-xs font-bold opacity-60 tracking-tight">Vault Architecture</label>
                  <div className={`flex p-1 rounded-xl md:rounded-2xl ${themeClasses.sectionBg} border ${themeClasses.border} shadow-inner overflow-hidden`}>
                    {(["grid", "table"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => onViewModeChange(mode)}
                        className={`flex-1 py-2 md:py-2.5 px-2 md:px-3 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${viewMode === mode
                          ? `${themeClasses.activeBg} ${themeClasses.activeText} shadow-sm`
                          : `${themeClasses.textSecondary} opacity-40 hover:opacity-100`
                          }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 md:space-y-5">
                  <label className="text-[10px] md:text-xs font-bold opacity-60 tracking-tight">Interface Density</label>
                  <div className={`flex p-1 rounded-xl md:rounded-2xl ${themeClasses.sectionBg} border ${themeClasses.border} shadow-inner overflow-hidden`}>
                    {(["small", "medium", "large"] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => onItemSizeChange(size)}
                        className={`flex-1 py-2 md:py-2.5 px-1 md:px-1.5 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${itemSize === size
                          ? `${themeClasses.activeBg} ${themeClasses.activeText} shadow-md`
                          : `${themeClasses.textSecondary} opacity-40 hover:opacity-100`
                          }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </section>
          </motion.div>
        )}

        {activeSection === "fields" && (
          <motion.div
            key="fields"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-12 md:space-y-14"
          >
            <header className="md:hidden mb-8">
              <h1 className="text-2xl font-black tracking-tight uppercase opacity-90">Settings</h1>
            </header>

            <section className="space-y-6">
              <div className={`p-6 rounded-2xl ${themeClasses.sectionBg} border ${themeClasses.border} space-y-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-bold ${themeClasses.text} mb-1`}>Custom Fields</h3>
                    <p className={`text-sm ${themeClasses.textSecondary}`}>Define custom field templates for password entries.</p>
                  </div>
                  <button
                    onClick={() => onCustomFieldTemplatesChange([...customFieldTemplates, { name: "", type: "text" }])}
                    className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-xs ${accentClasses.bgClass} ${accentClasses.onContrastClass} hover:opacity-90 transition-all flex items-center gap-2`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Field
                  </button>
                </div>

                {customFieldTemplates.length === 0 && (
                  <p className={`text-sm ${themeClasses.textMuted} italic`}>No custom fields defined. Add one above.</p>
                )}

                <div className="space-y-3">
                  {customFieldTemplates.map((field, i) => (
                    <div key={i} className={`p-4 rounded-xl ${themeClasses.input} border ${themeClasses.border} flex items-center gap-3`}>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => {
                          const next = [...customFieldTemplates];
                          next[i] = { ...next[i], name: e.target.value };
                          onCustomFieldTemplatesChange(next);
                        }}
                        placeholder="Field name (e.g., Security Question)"
                        className="flex-1 bg-transparent border-0 text-sm text-white placeholder-gray-500 focus:outline-none"
                      />
                      <button
                        onClick={() => onCustomFieldTemplatesChange(customFieldTemplates.filter((_, j) => j !== i))}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {activeSection === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-12 md:space-y-14"
          >
            <header className="md:hidden mb-8">
              <h1 className="text-2xl font-black tracking-tight uppercase opacity-90">Settings</h1>
            </header>

            <SecuritySettings
              theme={theme}
              accentColor={accentColor}
              clipboardClearSeconds={clipboardClearSeconds}
              onClipboardClearSecondsChange={onClipboardClearSecondsChange}
              revealCensorSeconds={revealCensorSeconds}
              onRevealCensorSecondsChange={onRevealCensorSecondsChange}
            />
          </motion.div>
        )}


      </AnimatePresence>
    </SettingsLayout>
  );
}
