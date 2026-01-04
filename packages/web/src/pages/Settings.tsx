import { useState } from "react";
import type { Theme, AccentColor } from "../types";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { getAccentColorClasses } from "../utils/theme";

const Icons = {
    Appearance: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-3M9.707 3.293l-3.414 3.414A2 2 0 006 8.121V11h3a2 2 0 002-2V5a2 2 0 00-2-2 1.99 1.99 0 00-1.293.293z" />
        </svg>
    ),
};

export default function Settings() {
    const { theme, setTheme, accentColor, setAccentColor, themeClasses, accentClasses } = useTheme();
    const [activeSection, setActiveSection] = useState<"appearance">("appearance");

    const navItems = [
        { id: "appearance", label: "Appearance", icon: <Icons.Appearance /> },
    ] as const;

    return (
        <div className={`flex flex-col h-full w-full ${themeClasses.bg} ${themeClasses.text} overflow-hidden font-sans rounded-3xl transition-colors duration-300`}>
            <div className="max-w-5xl mx-auto w-full h-full flex px-4 md:px-10 pt-6 md:pt-8 bg-transparent">
                {/* Floating Sidebar Navigation */}
                <div className="hidden md:block w-48 md:w-56 flex-shrink-0 pr-4 md:pr-10">
                    <div className="mb-8 md:mb-10">
                        <h1 className="text-lg md:text-xl font-black tracking-tight uppercase opacity-90 truncate">Settings</h1>
                        <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 ${themeClasses.textTertiary} truncate`}>Guardian Panel</p>
                    </div>

                    <nav className="space-y-1 focus:outline-none">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full flex items-center gap-2.5 md:gap-3 px-3.5 md:px-4 py-3 md:py-3.5 rounded-xl transition-all duration-300 group relative ${activeSection === item.id
                                    ? `${accentClasses.bgClass}/20 ${accentClasses.textClass} shadow-sm`
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
                                {/* Header for Mobile/Title */}
                                <header className="md:hidden mb-8">
                                    <h1 className="text-2xl font-black tracking-tight uppercase opacity-90">Settings</h1>
                                </header>

                                <header className="hidden md:block">
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2 md:mb-3">Appearance</h2>
                                    <p className={`text-xs md:text-sm ${themeClasses.textSecondary} max-w-md leading-relaxed`}>
                                        Refine the visual protocols of your web panel.
                                    </p>
                                </header>

                                {/* Theme Selector */}
                                <section>
                                    <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-6 md:mb-8 block ${themeClasses.textTertiary}`}>Color Profile</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
                                        {(["light", "dark", "slate", "editor", "violet"] as Theme[]).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setTheme(t)}
                                                className="group flex flex-col items-center gap-3"
                                            >
                                                <div className={`
                          w-full aspect-[4/3] rounded-xl md:rounded-2xl border-2 transition-all duration-500 overflow-hidden relative
                          ${theme === t ? `border-transparent ring-1 ring-offset-2 ring-offset-transparent ring-${accentClasses.base} shadow-xl scale-105` : `${themeClasses.border} hover:scale-105 hover:shadow-lg`}
                        `}>
                                                    <div className={`absolute inset-0 p-1.5 md:p-2 flex flex-col gap-1.5 md:gap-2 ${t === 'light' ? 'bg-[#f4f4f5]' :
                                                        t === 'slate' ? 'bg-[#0f172a]' :
                                                            t === 'editor' ? 'bg-[#1e1e1e]' :
                                                                t === 'violet' ? 'bg-[#1a1b26]' : 'bg-[#0a0a0a]'
                                                        }`}>
                                                        <div className={`h-2 md:h-2.5 w-3/4 rounded-full ${t === 'light' ? 'bg-slate-200' : 'bg-white/10'}`} />
                                                        <div className="flex-1 grid grid-cols-2 gap-1.5 md:gap-2">
                                                            <div className={`rounded-md md:rounded-lg ${t === 'light' ? 'bg-white shadow-sm' :
                                                                t === 'slate' ? 'bg-[#1e293b]' :
                                                                    t === 'editor' ? 'bg-[#252526]' :
                                                                        t === 'violet' ? 'bg-[#24283b]' : 'bg-[#161616]'
                                                                }`} />
                                                            <div className={`rounded-md md:rounded-lg ${t === 'light' ? 'bg-white shadow-sm' :
                                                                t === 'slate' ? 'bg-[#1e293b]' :
                                                                    t === 'editor' ? 'bg-[#252526]' :
                                                                        t === 'violet' ? 'bg-[#24283b]' : 'bg-[#161616]'
                                                                }`} />
                                                        </div>
                                                        <div className={`h-4 md:h-5 w-full rounded-md md:rounded-lg ${theme === t ? 'opacity-100 shadow-md' : 'opacity-70'} ${accentClasses.bgClass} transition-opacity duration-500`} />
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
                                            // We need to get specific classes for each color button, not just the currently active accent color
                                            // But for the active state ring, we use the button's own color
                                            // The problem is getAccentColorClasses needs to be called for EACH color in the loop

                                            // Wait, the previous implementation was calling getAccentColorClasses inside the loop.
                                            // I should replicate that logic properly.
                                            // I will use a helper or just import getAccentColorClasses again if needed?
                                            // Ah, I can import it.

                                            return (
                                                <ColorButton
                                                    key={color}
                                                    color={color}
                                                    activeColor={accentColor}
                                                    onClick={() => setAccentColor(color)}
                                                />
                                            );
                                        })}
                                    </div>
                                </section>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// Helper component to avoid import issues inside the loop
function ColorButton({ color, activeColor, onClick }: { color: AccentColor, activeColor: AccentColor, onClick: () => void }) {
    const colorClasses = getAccentColorClasses(color);
    const isActive = activeColor === color;

    return (
        <button
            onClick={onClick}
            className={`
                relative w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl transition-all duration-500 group
                ${isActive ? `ring-1 ring-offset-2 ring-offset-transparent ring-${colorClasses.base} scale-110 shadow-lg` : 'hover:scale-110'}
                ${colorClasses.bgClass}
            `}
        >
            {isActive && (
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
    )
}
