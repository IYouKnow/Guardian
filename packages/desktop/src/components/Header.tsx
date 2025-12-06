interface HeaderProps {
  activeCategory: string;
  passwordCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: "dark" | "half-dark" | "light";
}

export default function Header({
  activeCategory,
  passwordCount,
  searchQuery,
  onSearchChange,
  theme,
}: HeaderProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-gray-50",
        text: "text-gray-900",
        textSecondary: "text-gray-600",
        border: "border-gray-200",
        inputBg: "bg-gray-100",
        buttonBg: "bg-gray-100",
        buttonHover: "hover:bg-gray-200",
        buttonBorder: "border-gray-200",
        iconColor: "text-gray-500",
      };
    } else if (theme === "half-dark") {
      return {
        bg: "bg-gray-900",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        border: "border-gray-700",
        inputBg: "bg-gray-800",
        buttonBg: "bg-gray-800",
        buttonHover: "hover:bg-gray-700",
        buttonBorder: "border-gray-700",
        iconColor: "text-gray-500",
      };
    } else {
      return {
        bg: "bg-[#0a0a0a]",
        text: "text-white",
        textSecondary: "text-gray-400",
        border: "border-[#1a1a1a]",
        inputBg: "bg-[#0a0a0a]",
        buttonBg: "bg-[#1a1a1a]",
        buttonHover: "hover:bg-[#222222]",
        buttonBorder: "border-[#1a1a1a]",
        iconColor: "text-gray-500",
      };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <header className={`${themeClasses.bg} border-b ${themeClasses.border} p-6 overflow-x-hidden`}>
      <div className="flex items-center justify-between mb-6 min-w-0">
        <div className="min-w-0 flex-1">
          <h2 className={`text-2xl font-bold ${themeClasses.text} mb-1 truncate`}>
            {activeCategory === "all" ? "All Passwords" : activeCategory}
          </h2>
          <p className={`text-sm ${themeClasses.textSecondary}`}>{passwordCount} passwords</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className={`px-4 py-2 ${themeClasses.buttonBg} ${themeClasses.buttonHover} ${themeClasses.text} rounded-lg text-sm font-medium transition-all border ${themeClasses.buttonBorder}`}>
            Import
          </button>
          <button className={`px-4 py-2 ${themeClasses.buttonBg} ${themeClasses.buttonHover} ${themeClasses.text} rounded-lg text-sm font-medium transition-all border ${themeClasses.buttonBorder}`}>
            Export
          </button>
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
          className={`w-full pl-12 pr-4 py-3 ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all`}
        />
      </div>
    </header>
  );
}

