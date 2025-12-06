interface SettingsProps {
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  theme: "dark" | "half-dark" | "light";
  onThemeChange: (theme: "dark" | "half-dark" | "light") => void;
}

export default function Settings({ viewMode, onViewModeChange, theme, onThemeChange }: SettingsProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-white",
        text: "text-gray-900",
        cardBg: "bg-gray-50",
        border: "border-gray-200",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-500",
      };
    } else if (theme === "half-dark") {
      return {
        bg: "bg-gray-900",
        text: "text-gray-100",
        cardBg: "bg-gray-800",
        border: "border-gray-700",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
      };
    } else {
      return {
        bg: "bg-black",
        text: "text-white",
        cardBg: "bg-[#0a0a0a]",
        border: "border-[#1a1a1a]",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
      };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <div className={`flex-1 overflow-y-auto p-6 ${themeClasses.bg} ${themeClasses.text}`}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
          }`}>Settings</h1>
          <p className={themeClasses.textSecondary}>Manage your password manager preferences</p>
        </div>

        <div className="space-y-6">
          {/* Theme Setting */}
          <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-6`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold mb-2 ${
                theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
              }`}>Theme</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                Customize the appearance of your password manager
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => onThemeChange("dark")}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  theme === "dark"
                    ? "bg-yellow-400/20 border-2 border-yellow-400 text-yellow-400"
                    : theme === "light"
                    ? "border border-gray-200 text-gray-600 hover:text-gray-900"
                    : "border border-gray-700 text-gray-400 hover:text-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dark Mode</span>
                  {theme === "dark" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
              <button
                onClick={() => onThemeChange("half-dark")}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  theme === "half-dark"
                    ? "bg-yellow-400/20 border-2 border-yellow-400 text-yellow-400"
                    : `${themeClasses.border} border ${themeClasses.textSecondary} hover:${themeClasses.text}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Half Dark Mode</span>
                  {theme === "half-dark" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
              <button
                onClick={() => onThemeChange("light")}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  theme === "light"
                    ? "bg-yellow-400/20 border-2 border-yellow-400 text-yellow-400"
                    : `${themeClasses.border} border ${themeClasses.textSecondary} hover:${themeClasses.text}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Light Mode</span>
                  {theme === "light" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* View Mode Setting */}
          <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-6`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold mb-2 ${
                theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
              }`}>Display Preferences</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                Customize how your passwords are displayed in the main view
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === "light" ? "text-gray-700" : theme === "half-dark" ? "text-gray-300" : "text-gray-300"
                }`}>
                  View Mode
                </label>
                <select
                  value={viewMode}
                  onChange={(e) => onViewModeChange(e.target.value as "grid" | "table")}
                  className={`w-full ${themeClasses.cardBg} border ${themeClasses.border} rounded-lg px-4 py-3 ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all`}
                >
                  <option value="grid">Grid View</option>
                  <option value="table">Table View</option>
                </select>
              </div>

              <div className={`${theme === "light" ? "bg-gray-100" : theme === "half-dark" ? "bg-gray-700" : "bg-[#111111]"} border ${themeClasses.border} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium mb-1 ${
                      theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
                    }`}>About View Modes</h3>
                    <p className={`text-sm ${themeClasses.textSecondary} leading-relaxed`}>
                      <strong className={theme === "light" ? "text-gray-800" : theme === "half-dark" ? "text-gray-200" : "text-gray-300"}>Grid View:</strong> Displays passwords as cards in a grid layout. 
                      Ideal for quickly browsing through your passwords with visual icons. Best for users who prefer a 
                      more visual and modern interface.
                    </p>
                    <p className={`text-sm ${themeClasses.textSecondary} leading-relaxed mt-2`}>
                      <strong className={theme === "light" ? "text-gray-800" : theme === "half-dark" ? "text-gray-200" : "text-gray-300"}>Table View:</strong> Displays passwords in a traditional table format 
                      with columns for service, username, website, password, and category. Perfect for users who need to 
                      see more information at once and prefer a compact, organized layout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Settings Placeholder */}
          <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-6`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold mb-2 ${
                theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
              }`}>Security</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                Security and encryption settings
              </p>
            </div>
            <p className={`text-sm ${themeClasses.textTertiary}`}>More security options coming soon...</p>
          </div>

          {/* Additional Settings Placeholder */}
          <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-6`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold mb-2 ${
                theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
              }`}>General</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                General application preferences
              </p>
            </div>
            <p className={`text-sm ${themeClasses.textTertiary}`}>More general options coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
