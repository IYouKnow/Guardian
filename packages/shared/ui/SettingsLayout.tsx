
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
    const accentClasses = getAccentColorClasses(accentColor, theme);

    return (
        <div className={`flex flex-col h-full w-full ${themeClasses.text} overflow-hidden font-sans rounded-xl transition-colors duration-200`}>
            <div className="max-w-5xl mx-auto w-full h-full flex px-4 md:px-6 pt-4 md:pt-6 bg-transparent">
                {/* Floating Sidebar Navigation */}
                <div className="hidden md:block w-44 md:w-48 flex-shrink-0 pr-4 md:pr-8">
                    <div className="mb-6 md:mb-8">
                        <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h1>
                        <p className={`text-xs ${themeClasses.textTertiary} truncate`}>{subtitle}</p>
                    </div>

                    <nav className="space-y-0.5 focus:outline-none">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSectionChange(item.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group relative ${activeSection === item.id
                                    ? `${accentClasses.bgClass} ${accentClasses.onContrastClass}`
                                    : `${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                                    }`}
                            >
                                <div className={`transition-transform duration-200 shrink-0 ${activeSection === item.id ? '' : 'group-hover:opacity-70'}`}>
                                    {item.icon}
                                </div>
                                <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto pb-16 px-2 md:px-4 scrollbar-hide min-w-0">
                    {/* Header for Mobile/Title */}
                    <header className="md:hidden mb-4 flex items-center gap-3">
                        {onBack && (
                            <button onClick={onBack} className={`p-2 -ml-2 rounded-lg transition-all ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${themeClasses.activeText}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </button>
                        )}
                        <h1 className="text-xl font-semibold">{title}</h1>
                    </header>

                    {/* Mobile Navigation (Horizontal Scroll) */}
                    <div className="md:hidden mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSectionChange(item.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border shrink-0 ${activeSection === item.id
                                    ? `${accentClasses.bgClass} ${accentClasses.onContrastClass} border-transparent`
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
