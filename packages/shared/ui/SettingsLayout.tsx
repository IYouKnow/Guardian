import { motion } from "framer-motion";
import type { Theme, AccentColor } from "../themes/index";
import { getAccentColorClasses, getThemeClasses } from "../themes/index";

export interface SettingsNavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
}

interface SettingsLayoutProps {
    title?: string;
    subtitle?: string;
    navItems: SettingsNavItem[];
    activeSection: string;
    onSectionChange: (id: string) => void;
    theme: Theme;
    accentColor: AccentColor;
    children: React.ReactNode;
    onBack?: () => void;
}

export const SettingsLayout = ({
    title = "Settings",
    subtitle = "Guardian Panel",
    navItems,
    activeSection,
    onSectionChange,
    theme,
    accentColor,
    children,
    onBack
}: SettingsLayoutProps) => {
    const themeClasses = getThemeClasses(theme);
    const accentClasses = getAccentColorClasses(accentColor);

    return (
        <div className={`flex flex-col h-full w-full ${themeClasses.bg} ${themeClasses.text} overflow-hidden font-sans rounded-3xl transition-colors duration-300`}>
            <div className="max-w-5xl mx-auto w-full h-full flex px-4 md:px-10 pt-6 md:pt-8 bg-transparent">
                {/* Floating Sidebar Navigation */}
                <div className="hidden md:block w-48 md:w-56 flex-shrink-0 pr-4 md:pr-10">
                    <div className="mb-8 md:mb-10">
                        <h1 className="text-lg md:text-xl font-black tracking-tight uppercase opacity-90 truncate">{title}</h1>
                        <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 ${themeClasses.textTertiary} truncate`}>{subtitle}</p>
                    </div>

                    <nav className="space-y-1 focus:outline-none">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSectionChange(item.id)}
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
                    {/* Header for Mobile/Title */}
                    <header className="md:hidden mb-6 flex items-center gap-4">
                        {onBack && (
                            <button onClick={onBack} className={`p-2 -ml-2 rounded-lg transition-all ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${themeClasses.activeText}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </button>
                        )}
                        <h1 className="text-2xl font-black tracking-tight uppercase opacity-90">{title}</h1>
                    </header>

                    {/* Mobile Navigation (Horizontal Scroll) */}
                    <div className="md:hidden mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSectionChange(item.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${activeSection === item.id
                                        ? `${accentClasses.bgClass}/10 ${accentClasses.textClass} border-${accentColor}-400/20`
                                        : `${themeClasses.inputBg} ${themeClasses.textSecondary} ${themeClasses.border}`
                                    }`}
                            >
                                <span className={`w-4 h-4 ${activeSection === item.id ? '' : 'opacity-70'}`}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
};
