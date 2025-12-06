import { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface SidebarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  onAddPassword: () => void;
  onLogout: () => void;
  onSettings: () => void;
  showSettings: boolean;
  theme: Theme;
  accentColor: AccentColor;
}

export default function Sidebar({
  categories,
  activeCategory,
  onCategoryChange,
  onAddPassword,
  onLogout,
  onSettings,
  showSettings,
  theme,
  accentColor,
}: SidebarProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-500",
        border: "border-gray-300",
        cardBg: "bg-gray-200",
        hoverBg: "hover:bg-gray-200",
        hoverText: "hover:text-gray-800",
        activeBg: "bg-gray-200",
      };
    } else if (theme === "slate") {
      return {
        bg: "bg-gray-900",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        border: "border-gray-700",
        cardBg: "bg-gray-800",
        hoverBg: "hover:bg-gray-800",
        hoverText: "hover:text-gray-100",
        activeBg: "bg-gray-800",
      };
    } else if (theme === "editor") {
      return {
        bg: "bg-[#252526]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-[#858585]",
        textTertiary: "text-[#6a6a6a]",
        border: "border-[#3e3e42]",
        cardBg: "bg-[#2a2d2e]",
        hoverBg: "hover:bg-[#2a2d2e]",
        hoverText: "hover:text-[#d4d4d4]",
        activeBg: "bg-[#2a2d2e]",
      };
    } else if (theme === "violet") {
      return {
        bg: "bg-[#282a36]",
        text: "text-[#f8f8f2]",
        textSecondary: "text-[#c9a0dc]",
        textTertiary: "text-[#6272a4]",
        border: "border-[#6272a4]/60",
        cardBg: "bg-[#44475a]",
        hoverBg: "hover:bg-[#44475a]",
        hoverText: "hover:text-[#f8f8f2]",
        activeBg: "bg-[#44475a]",
      };
    } else {
      // dark (default)
      return {
        bg: "bg-[#0a0a0a]",
        text: "text-white",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        border: "border-[#1a1a1a]",
        cardBg: "bg-[#1a1a1a]",
        hoverBg: "hover:bg-[#111111]",
        hoverText: "hover:text-white",
        activeBg: "bg-[#1a1a1a]",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <aside className={`w-full h-full ${themeClasses.bg} border-r ${themeClasses.border} flex flex-col`}>
      <div className={`p-8 border-b ${themeClasses.border}`}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className={`text-3xl font-bold ${themeClasses.text} mb-1`}>Guardian</h1>
            <p className={`text-sm ${themeClasses.textSecondary}`}>Password Manager</p>
          </div>
          <button
            onClick={onLogout}
            className={`p-2 ${themeClasses.textTertiary} hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all`}
            title="Lock vault"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="mb-6">
          <h3 className={`text-xs font-semibold ${themeClasses.textTertiary} uppercase tracking-wider mb-3 px-3`}>
            Categories
          </h3>
          <ul className="space-y-1">
            {categories.map((category) => (
              <li key={category}>
                <button
                  onClick={() => {
                    onCategoryChange(category);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeCategory === category && !showSettings
                      ? `${themeClasses.activeBg} ${accentClasses.textClass}`
                      : `${themeClasses.textSecondary} ${themeClasses.hoverBg} ${themeClasses.hoverText}`
                  }`}
                >
                  {category === "all" ? "All Passwords" : category}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={`border-t ${themeClasses.border} pt-4`}>
          <ul className="space-y-1">
            <li>
              <button className={`w-full text-left px-3 py-2 rounded-lg text-sm ${themeClasses.textSecondary} ${themeClasses.hoverBg} ${themeClasses.hoverText} transition-all flex items-center gap-2`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Favorites
              </button>
            </li>
            <li>
              <button
                onClick={onSettings}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  showSettings
                    ? `${themeClasses.activeBg} ${accentClasses.textClass}`
                    : `${themeClasses.textSecondary} ${themeClasses.hoverBg} ${themeClasses.hoverText}`
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className={`p-4 border-t ${themeClasses.border}`}>
        <button
          onClick={onAddPassword}
          className={`w-full ${accentClasses.bgClass} ${accentClasses.bgHoverClass} text-black font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg ${accentClasses.shadowClass}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Password
        </button>
      </div>
    </aside>
  );
}

