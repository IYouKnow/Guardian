import { useState } from "react";
import { Theme, AccentColor } from "../types";
import { getThemeClasses, AppearanceSettings, SettingsLayout, SecuritySettings } from "@guardian/shared";
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
}

type SettingsSection = "appearance" | "security";

const Icons = {
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
  onRevealCensorSecondsChange
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  const themeClasses = getThemeClasses(theme);


  const navItems = [
    { id: "appearance", label: "Appearance", icon: <Icons.Appearance /> },
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

            <AppearanceSettings
              theme={theme}
              accentColor={accentColor}
              onThemeChange={onThemeChange}
              onAccentColorChange={onAccentColorChange}
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
