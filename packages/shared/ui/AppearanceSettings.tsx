import { motion } from "framer-motion";
import type { Theme, AccentColor } from "../themes/index";
import { getAccentColorClasses, getThemeClasses } from "../themes/index";

interface AppearanceSettingsProps {
    theme: Theme;
    accentColor: AccentColor;
    onThemeChange: (theme: Theme) => void;
    onAccentColorChange: (color: AccentColor) => void;
    showTitle?: boolean;
    syncTheme?: boolean;
    onSyncThemeChange?: (sync: boolean) => void;
}

export const AppearanceSettings = ({
    theme,
    accentColor,
    onThemeChange,
    onAccentColorChange,
    showTitle = true,
    syncTheme,
    onSyncThemeChange
}: AppearanceSettingsProps) => {
    const themeClasses = getThemeClasses(theme);
    const accentClasses = getAccentColorClasses(accentColor, theme);

    const themes: Theme[] = ["system", "light", "dark", "slate", "editor", "violet"];
    const accents: AccentColor[] = ["black", "yellow", "blue", "green", "purple", "pink", "orange", "cyan", "red"];



    return (
        <div className="space-y-12 md:space-y-14">
            {showTitle && (
                <header>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2 md:mb-3">Appearance</h2>
                    <p className={`text-xs md:text-sm ${themeClasses.textSecondary} max-w-md leading-relaxed`}>
                        Refine the visual protocols of your interface.
                    </p>
                </header>
            )}

            {/* Sync Theme Option */}
            {onSyncThemeChange && typeof syncTheme !== 'undefined' && (
                <div className={`flex items-center justify-between p-4 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                    <div>
                        <h3 className={`text-sm font-bold ${themeClasses.text}`}>Sync with Server</h3>
                        <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>Automatically apply theme from your vault.</p>
                    </div>
                    <button
                        onClick={() => onSyncThemeChange(!syncTheme)}
                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${syncTheme ? accentClasses.bgClass : 'bg-gray-700/50'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${syncTheme ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
            )}

            {/* Theme Selector */}
            <section>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-6 md:mb-8 block ${themeClasses.textTertiary}`}>Color Profile</label>
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-5">
                    {themes.map((t) => {
                        // For system, we show a special preview or just use dark as base
                        const previewTheme = t === 'system' ? 'dark' : t;
                        const tClasses = getThemeClasses(previewTheme);

                        return (
                            <button
                                key={t}
                                disabled={syncTheme}
                                onClick={() => !syncTheme && onThemeChange(t)}
                                className={`group flex flex-col items-center gap-3 ${syncTheme ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                            >
                                <div className={`
                                    w-full aspect-[4/3] rounded-xl md:rounded-2xl border-2 transition-all duration-500 overflow-hidden relative
                                    ${theme === t
                                        ? `border-transparent ring-2 ${accentClasses.focusRingClass.replace('focus:', '')} shadow-xl scale-105`
                                        : `${themeClasses.border} opacity-80 ${syncTheme ? '' : 'hover:opacity-100'}`
                                    }
                                `}>
                                    {t === 'system' ? (
                                        <div className="absolute inset-0 bg-gradient-to-br from-white to-black flex items-center justify-center">
                                            <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`absolute inset-0 p-1.5 md:p-2 flex flex-col gap-1.5 md:gap-2 ${tClasses.bg}`}>
                                            <div className={`h-2 md:h-2.5 w-3/4 rounded-full ${t === 'light' ? 'bg-slate-200' : 'bg-white/10'}`} />
                                            <div className="flex-1 grid grid-cols-2 gap-1.5 md:gap-2">
                                                <div className={`rounded-md md:rounded-lg ${tClasses.sectionBg}`} />
                                                <div className={`rounded-md md:rounded-lg ${tClasses.sectionBg}`} />
                                            </div>
                                            <div className={`h-4 md:h-5 w-full rounded-md md:rounded-lg ${theme === t ? 'opacity-100 shadow-md' : 'opacity-70'} ${accentClasses.bgClass} transition-opacity duration-500`} />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${theme === t ? accentClasses.textClass : themeClasses.textSecondary}`}>
                                    {t}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className={`h-px w-full ${themeClasses.divider} opacity-40`} />

            {/* Accent Color Selection */}
            <section>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-6 md:mb-8 block ${themeClasses.textTertiary}`}>Interface Accent</label>
                <div className="flex flex-wrap gap-3 md:gap-4">
                    {accents.map((color) => {
                        const colorClasses = getAccentColorClasses(color, theme);
                        const isActive = accentColor === color;
                        return (
                            <button
                                key={color}
                                disabled={syncTheme}
                                onClick={() => !syncTheme && onAccentColorChange(color)}
                                className={`
                                    relative w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl transition-all duration-500 group
                                    ${isActive
                                        ? `ring-2 ring-offset-4 ring-offset-transparent ${colorClasses.focusRingClass.replace('focus:', '')} scale-110 shadow-lg`
                                        : `${syncTheme ? '' : 'hover:scale-110 hover:opacity-100'} opacity-70`
                                    }
                                    ${colorClasses.bgClass}
                                    ${syncTheme ? 'opacity-30 cursor-not-allowed' : ''}
                                `}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="accent-check-shared"
                                        className={`absolute inset-0 flex items-center justify-center ${colorClasses.onContrastClass}`}
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
        </div>
    );
};
