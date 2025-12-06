interface SettingsProps {
  onBack: () => void;
  onLogout: () => void;
  theme: "dark" | "half-dark" | "light";
  onThemeChange: (theme: "dark" | "half-dark" | "light") => void;
}

export default function Settings({ onBack, onLogout, theme, onThemeChange }: SettingsProps) {
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
    <div className={`flex flex-col h-full ${themeClasses.bg} ${themeClasses.text}`}>
      <div className={`flex items-center gap-4 p-4 border-b ${themeClasses.border}`}>
        <button
          onClick={onBack}
          className={`p-2 transition-colors ${
            theme === "light" 
              ? "text-gray-600 hover:text-gray-900" 
              : theme === "half-dark"
              ? "text-gray-400 hover:text-gray-100"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className={`text-xl font-bold ${
          theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
        }`}>Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="space-y-4">
          <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
            <h3 className={`font-semibold mb-3 ${
              theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
            }`}>Theme</h3>
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

          <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
            <h3 className={`font-semibold mb-2 ${
              theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
            }`}>About</h3>
            <p className={`text-sm ${
              theme === "light" ? "text-gray-600" : theme === "half-dark" ? "text-gray-400" : "text-gray-400"
            }`}>
              Guardian Password Manager
            </p>
            <p className={`text-xs mt-1 ${
              theme === "light" ? "text-gray-500" : theme === "half-dark" ? "text-gray-500" : "text-gray-500"
            }`}>
              Version 1.0.0
            </p>
          </div>

          <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
            <h3 className={`font-semibold mb-3 ${
              theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
            }`}>Security</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${
                  theme === "light" ? "text-gray-600" : theme === "half-dark" ? "text-gray-400" : "text-gray-400"
                }`}>Auto-lock</span>
                <button className="text-yellow-400 text-sm">Off</button>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${
                  theme === "light" ? "text-gray-600" : theme === "half-dark" ? "text-gray-400" : "text-gray-400"
                }`}>Biometric unlock</span>
                <button className="text-yellow-400 text-sm">Off</button>
              </div>
            </div>
          </div>

          <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
            <h3 className={`font-semibold mb-3 ${
              theme === "light" ? "text-gray-900" : theme === "half-dark" ? "text-gray-100" : "text-white"
            }`}>Data</h3>
            <div className="space-y-3">
              <button className={`w-full text-left text-sm transition-colors ${
                theme === "light" 
                  ? "text-gray-600 hover:text-gray-900" 
                  : theme === "half-dark"
                  ? "text-gray-400 hover:text-gray-100"
                  : "text-gray-400 hover:text-white"
              }`}>
                Export vault
              </button>
              <button className={`w-full text-left text-sm transition-colors ${
                theme === "light" 
                  ? "text-gray-600 hover:text-gray-900" 
                  : theme === "half-dark"
                  ? "text-gray-400 hover:text-gray-100"
                  : "text-gray-400 hover:text-white"
              }`}>
                Backup vault
              </button>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg py-3 px-4 font-medium transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
