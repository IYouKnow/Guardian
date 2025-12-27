import { useState } from "react";
import { Theme, AccentColor } from "../types";
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
}

type SettingsSection = "appearance" | "security" | "general";

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
  ),
  General: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  onAccentColorChange
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-[#fafafa]",
        text: "text-gray-800",
        sectionBg: "bg-white/80",
        divider: "border-gray-200",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-400",
        hoverBg: "hover:bg-gray-100/50",
        activeBg: "bg-gray-100",
        activeText: "text-gray-900",
        border: "border-gray-200",
        cardBg: "bg-white",
        inputBg: "bg-gray-50",
      };
    } else if (theme === "slate") {
      return {
        bg: "bg-[#0f172a]",
        text: "text-slate-100",
        sectionBg: "bg-[#1e293b]/50",
        divider: "border-slate-800",
        textSecondary: "text-slate-400",
        textTertiary: "text-slate-500",
        hoverBg: "hover:bg-slate-800/50",
        activeBg: "bg-slate-800/80",
        activeText: "text-slate-100",
        border: "border-slate-800",
        cardBg: "bg-slate-800/40",
        inputBg: "bg-slate-900/50",
      };
    } else if (theme === "editor") {
      return {
        bg: "bg-[#1e1e1e]",
        text: "text-[#d4d4d4]",
        sectionBg: "bg-[#252526]/50",
        divider: "border-[#3e3e42]",
        textSecondary: "text-[#858585]",
        textTertiary: "text-[#6a6a6a]",
        hoverBg: "hover:bg-[#2a2d2e]/70",
        activeBg: "bg-[#2a2d2e]/80",
        activeText: "text-[#d4d4d4]",
        border: "border-[#333333]",
        cardBg: "bg-[#252526]/40",
        inputBg: "bg-[#1e1e1e]",
      };
    } else if (theme === "violet") {
      return {
        bg: "bg-[#1a1b26]",
        text: "text-[#a9b1d6]",
        sectionBg: "bg-[#24283b]/50",
        divider: "border-[#414868]/40",
        textSecondary: "text-[#787c99]",
        textTertiary: "text-[#565f89]",
        hoverBg: "hover:bg-[#414868]/30",
        activeBg: "bg-[#414868]/50",
        activeText: "text-[#c0caf5]",
        border: "border-[#414868]/30",
        cardBg: "bg-[#24283b]/40",
        inputBg: "bg-[#16161e]",
      };
    } else {
      return {
        bg: "bg-[#0a0a0a]",
        text: "text-white",
        sectionBg: "bg-[#111111]/50",
        divider: "border-white/5",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-600",
        hoverBg: "hover:bg-white/5",
        activeBg: "bg-white/10",
        activeText: "text-white",
        border: "border-white/5",
        cardBg: "bg-[#111111]/40",
        inputBg: "bg-black",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  const navItems = [
    { id: "appearance", label: "Appearance", icon: <Icons.Appearance /> },
    { id: "security", label: "Security", icon: <Icons.Security /> },
    { id: "general", label: "General", icon: <Icons.General /> },
  ] as const;

  return (
    <div className={`flex flex-col h-full w-full ${themeClasses.bg} ${themeClasses.text} overflow-hidden font-sans`}>
      <div className="max-w-5xl mx-auto w-full h-full flex px-4 md:px-10 pt-6 md:pt-12">
        {/* Floating Sidebar Navigation */}
        <div className="w-48 md:w-56 flex-shrink-0 pr-4 md:pr-10">
          <div className="mb-8 md:mb-10">
            <h1 className="text-lg md:text-xl font-black tracking-tight uppercase opacity-90 truncate">Settings</h1>
            <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 ${themeClasses.textTertiary} truncate`}>Guardian Vault</p>
          </div>

          <nav className="space-y-1 focus:outline-none">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-2.5 md:gap-3 px-3.5 md:px-4 py-3 md:py-3.5 rounded-xl transition-all duration-300 group relative ${activeSection === item.id
                  ? `${themeClasses.activeBg} ${themeClasses.activeText} shadow-sm`
                  : `${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                  }`}
              >
                <div className={`transition-transform duration-300 shrink-0 ${activeSection === item.id ? 'scale-105' : 'group-hover:scale-105 opacity-60'}`}>
                  {item.icon}
                </div>
                <span className="text-[11px] md:text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                {activeSection === item.id && (
                  <motion.div
                    layoutId="section-indicator"
                    className={`absolute left-0 w-1 h-4 md:h-5 rounded-full ${accentClasses.bgClass}`}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-20 px-2 md:px-4 scrollbar-hide min-w-0">
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
                {/* Header */}
                <header>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2 md:mb-3">Appearance</h2>
                  <p className={`text-xs md:text-sm ${themeClasses.textSecondary} max-w-md leading-relaxed`}>
                    Refine the visual protocols of your vault interface.
                  </p>
                </header>

                {/* Theme Selector */}
                <section>
                  <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-6 md:mb-8 block ${themeClasses.textTertiary}`}>Color Profile</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
                    {(["light", "dark", "slate", "editor", "violet"] as Theme[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => onThemeChange(t)}
                        className="group flex flex-col items-center gap-3"
                      >
                        <div className={`
                          w-full aspect-[4/3] rounded-xl md:rounded-2xl border-2 transition-all duration-500 overflow-hidden relative
                          ${theme === t ? `border-transparent ring-2 ${accentClasses.focusRingClass} shadow-xl scale-105` : `${themeClasses.border} opacity-50 grayscale hover:grayscale-0 hover:opacity-100`}
                        `}>
                          <div className={`absolute inset-0 p-1.5 md:p-2 flex flex-col gap-1.5 md:gap-2 ${t === 'light' ? 'bg-[#fafafa]' :
                            t === 'slate' ? 'bg-[#0f172a]' :
                              t === 'editor' ? 'bg-[#1e1e1e]' :
                                t === 'violet' ? 'bg-[#1a1b26]' : 'bg-[#050505]'
                            }`}>
                            <div className={`h-2 md:h-2.5 w-3/4 rounded-full ${t === 'light' ? 'bg-gray-200' : 'bg-white/10'}`} />
                            <div className="flex-1 grid grid-cols-2 gap-1.5 md:gap-2">
                              <div className={`rounded-md md:rounded-lg ${t === 'light' ? 'bg-gray-100' : 'bg-white/5'}`} />
                              <div className={`rounded-md md:rounded-lg ${t === 'light' ? 'bg-gray-100' : 'bg-white/5'}`} />
                            </div>
                            <div className={`h-4 md:h-5 w-full rounded-md md:rounded-lg ${theme === t ? 'opacity-100 shadow-md' : 'opacity-30'} ${getAccentColorClasses(accentColor).bgClass} transition-opacity duration-500`} />
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${theme === t ? accentClasses.textClass : themeClasses.textSecondary}`}>
                          {t}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <div className={`h-px w-full ${themeClasses.divider} opacity-40`} />

                {/* Accent Color Selection */}
                <section>
                  <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-6 md:mb-8 block ${themeClasses.textTertiary}`}>Interface Accent</label>
                  <div className="flex flex-wrap gap-3 md:gap-4">
                    {(["yellow", "blue", "green", "purple", "pink", "orange", "cyan", "red"] as AccentColor[]).map((color) => {
                      const colorClasses = getAccentColorClasses(color);
                      return (
                        <button
                          key={color}
                          onClick={() => onAccentColorChange(color)}
                          className={`
                            relative w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl transition-all duration-500 group
                            ${accentColor === color ? `ring-2 ring-offset-4 ring-offset-transparent ${colorClasses.focusRingClass} scale-110 shadow-lg` : 'hover:scale-110 opacity-70 hover:opacity-100'}
                            ${colorClasses.bgClass}
                          `}
                        >
                          {accentColor === color && (
                            <motion.div
                              layoutId="accent-check-modern"
                              className="absolute inset-0 flex items-center justify-center text-black"
                            >
                              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

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

                  <div className={`p-5 md:p-6 rounded-2xl md:rounded-3xl ${themeClasses.sectionBg} border ${themeClasses.border} flex flex-col sm:flex-row gap-4 md:gap-5 items-start sm:items-center shadow-lg transition-all`}>
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${accentClasses.lightClass} ${accentClasses.textClass}`}>
                      <Icons.Info />
                    </div>
                    <p className={`text-[9px] md:text-[10px] ${themeClasses.textSecondary} leading-relaxed font-bold tracking-tight max-w-sm`}>
                      Display protocols are stored as metadata. Grid mode optimizes for visual recognition, while Table mode facilitates data auditing.
                    </p>
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
                className="space-y-16"
              >
                <header>
                  <h2 className="text-3xl font-black tracking-tight mb-3">Security Protocols</h2>
                  <p className={themeClasses.textSecondary}>Cryptographic and access control settings for your vault.</p>
                </header>

                <div className={`p-16 rounded-[2.5rem] border-2 border-dashed ${themeClasses.border} ${themeClasses.sectionBg} text-center space-y-6`}>
                  <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${themeClasses.hoverBg}`}>
                    <Icons.Security />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight">Advanced Guarding</h3>
                    <p className={`${themeClasses.textSecondary} text-sm max-w-sm mx-auto leading-relaxed`}>
                      Multi-factor authentication and hardware key integration modules are being audited and will be deployed in a future security update.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-16"
              >
                <header>
                  <h2 className="text-3xl font-black tracking-tight mb-3">General Settings</h2>
                  <p className={themeClasses.textSecondary}>Global application parameters and system hooks.</p>
                </header>

                <div className={`p-16 rounded-[2.5rem] border-2 border-dashed ${themeClasses.border} ${themeClasses.sectionBg} text-center space-y-6`}>
                  <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${themeClasses.hoverBg}`}>
                    <Icons.General />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight">System Modules</h3>
                    <p className={`${themeClasses.textSecondary} text-sm max-w-sm mx-auto leading-relaxed`}>
                      Deep OS integration, auto-start, and telemetry-free update systems are currently in development.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
