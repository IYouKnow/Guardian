import { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface HeaderProps {
  activeCategory: string;
  passwordCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function Header({
  activeCategory,
  passwordCount,
  searchQuery,
  onSearchChange,
  theme,
  accentColor,
}: HeaderProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
        border: "border-gray-300",
        inputBg: "bg-gray-200",
        iconColor: "text-gray-500",
      };
    } else if (theme === "slate") {
      return {
        bg: "bg-gray-900",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        border: "border-gray-700",
        inputBg: "bg-gray-800",
        iconColor: "text-gray-500",
      };
    } else if (theme === "editor") {
      return {
        bg: "bg-[#2a2d2e]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-[#858585]",
        border: "border-[#3e3e42]",
        inputBg: "bg-[#1e1e1e]",
        iconColor: "text-[#858585]",
      };
    } else if (theme === "violet") {
      return {
        bg: "bg-[#44475a]",
        text: "text-[#f8f8f2]",
        textSecondary: "text-[#c9a0dc]",
        border: "border-[#6272a4]/60",
        inputBg: "bg-[#282a36]",
        iconColor: "text-[#c9a0dc]",
      };
    } else {
      // dark (default)
      return {
        bg: "bg-[#0a0a0a]",
        text: "text-white",
        textSecondary: "text-gray-400",
        border: "border-[#1a1a1a]",
        inputBg: "bg-[#0a0a0a]",
        iconColor: "text-gray-500",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <header className={`${themeClasses.bg} border-b ${themeClasses.border} p-6 overflow-x-hidden`}>
      <div className="flex items-center justify-between mb-6 min-w-0">
        <div className="min-w-0 flex-1">
          <h2 className={`text-2xl font-bold ${themeClasses.text} mb-1 truncate`}>
            {activeCategory === "all" ? "All Passwords" : activeCategory}
          </h2>
          <p className={`text-sm ${themeClasses.textSecondary}`}>{passwordCount} passwords</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <svg
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${themeClasses.iconColor}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search passwords..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-12 pr-4 py-3 ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} ${accentClasses.focusBorderClass} transition-all`}
        />
      </div>
    </header>
  );
}
