import { motion } from "framer-motion";
import type { Theme, AccentColor } from "../themes/index";
import { getAccentColorClasses, getThemeClasses } from "../themes/index";

interface AppearanceSettingsProps {
    theme: Theme;
    accentColor: AccentColor;
    onThemeChange: (theme: Theme) => void;
    onAccentColorChange: (color: AccentColor) => void;
    showTitle?: boolean;
}

export const AppearanceSettings = ({
    theme,
    accentColor,
    onThemeChange,
    onAccentColorChange,
    showTitle = true
}: AppearanceSettingsProps) => {
    const themeClasses = getThemeClasses(theme);
    const accentClasses = getAccentColorClasses(accentColor);

    const themes: Theme[] = ["light", "dark", "slate", "editor", "violet"];
    const accents: AccentColor[] = ["yellow", "blue", "green", "purple", "pink", "orange", "cyan", "red"];

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

            {/* Theme Selector */}
            <section>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-6 md:mb-8 block ${themeClasses.textTertiary}`}>Color Profile</label>
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5">
                    {themes.map((t) => {
                        const tClasses = getThemeClasses(t);
                        return (
                            <button
                                key={t}
                                onClick={() => onThemeChange(t)}
                                className="group flex flex-col items-center gap-3"
                            >
                                <div className={`
                                    w-full aspect-[4/3] rounded-xl md:rounded-2xl border-2 transition-all duration-500 overflow-hidden relative
                                    ${theme === t
                                        ? `border-transparent ring-2 ${accentClasses.focusRingClass.replace('focus:', '')} shadow-xl scale-105`
                                        : `${themeClasses.border} opacity-80 hover:opacity-100`
                                    }
                                `}>
                                    <div className={`absolute inset-0 p-1.5 md:p-2 flex flex-col gap-1.5 md:gap-2 ${tClasses.bg}`}>
                                        <div className={`h-2 md:h-2.5 w-3/4 rounded-full ${t === 'light' ? 'bg-slate-200' : 'bg-white/10'}`} />
                                        <div className="flex-1 grid grid-cols-2 gap-1.5 md:gap-2">
                                            <div className={`rounded-md md:rounded-lg ${tClasses.sectionBg}`} />
                                            <div className={`rounded-md md:rounded-lg ${tClasses.sectionBg}`} />
                                        </div>
                                        <div className={`h-4 md:h-5 w-full rounded-md md:rounded-lg ${theme === t ? 'opacity-100 shadow-md' : 'opacity-70'} ${accentClasses.bgClass} transition-opacity duration-500`} />
                                    </div>
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
                        const colorClasses = getAccentColorClasses(color);
                        const isActive = accentColor === color;
                        return (
                            <button
                                key={color}
                                onClick={() => onAccentColorChange(color)}
                                className={`
                                    relative w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl transition-all duration-500 group
                                    ${isActive
                                        ? `ring-2 ring-offset-4 ring-offset-transparent ${colorClasses.focusRingClass.replace('focus:', '')} scale-110 shadow-lg`
                                        : 'hover:scale-110 opacity-70 hover:opacity-100'
                                    }
                                    ${colorClasses.bgClass}
                                `}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="accent-check-shared"
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
        </div>
    );
};
