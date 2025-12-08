import { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface SettingsProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
  onBack: () => void;
  onLogout: () => void;
}

export default function Settings({ theme, onThemeChange, accentColor, onAccentColorChange, onBack, onLogout }: SettingsProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-[#fafafa]",
        text: "text-gray-800",
        sectionBg: "bg-gray-100/50",
        divider: "border-gray-300",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-500",
        hoverBg: "hover:bg-gray-200/50",
        activeBg: "bg-gray-200",
        activeText: "text-gray-800",
        radioBorder: "border-gray-400",
      };
    } else if (theme === "slate") {
      return {
        bg: "bg-gray-900",
        text: "text-gray-100",
        sectionBg: "bg-gray-800/30",
        divider: "border-gray-700",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        hoverBg: "hover:bg-gray-800/50",
        activeBg: "bg-gray-800/60",
        activeText: "text-gray-100",
        radioBorder: "border-gray-600",
      };
    } else if (theme === "editor") {
      return {
        bg: "bg-[#1e1e1e]",
        text: "text-[#d4d4d4]",
        sectionBg: "bg-[#252526]/50",
        divider: "border-[#3e3e42]",
        textSecondary: "text-[#858585]",
        textTertiary: "text-[#6a6a6a]",
        hoverBg: "hover:bg-[#2a2d2e]/70",
        activeBg: "bg-[#2a2d2e]/80",
        activeText: "text-[#d4d4d4]",
        radioBorder: "border-[#3e3e42]",
      };
    } else if (theme === "violet") {
      return {
        bg: "bg-[#282a36]",
        text: "text-[#f8f8f2]",
        sectionBg: "bg-[#44475a]/40",
        divider: "border-[#6272a4]/60",
        textSecondary: "text-[#c9a0dc]",
        textTertiary: "text-[#6272a4]",
        hoverBg: "hover:bg-[#44475a]/60",
        activeBg: "bg-[#44475a]/70",
        activeText: "text-[#f8f8f2]",
        radioBorder: "border-[#6272a4]/60",
      };
    } else {
      // dark (default)
      return {
        bg: "bg-black",
        text: "text-white",
        sectionBg: "bg-[#0a0a0a]/50",
        divider: "border-[#1a1a1a]",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        hoverBg: "hover:bg-[#0a0a0a]/70",
        activeBg: "bg-[#0a0a0a]/80",
        activeText: "text-white",
        radioBorder: "border-gray-600",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <div className={`flex-1 overflow-y-auto overflow-x-hidden ${themeClasses.bg} ${themeClasses.text}`}>
      <div className="max-w-4xl mx-auto min-w-0 px-4 py-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${themeClasses.text}`}>Settings</h1>
            <p className={`text-sm ${themeClasses.textSecondary}`}>Manage your preferences</p>
          </div>
          <button
            onClick={onBack}
            className={`p-2 ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors`}
            title="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-8">
          {/* Theme Setting */}
          <section>
            <div className="mb-4">
              <h2 className={`text-lg font-semibold mb-1 ${themeClasses.text}`}>Theme</h2>
              <p className={`text-xs ${themeClasses.textSecondary}`}>
                Customize the appearance
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => onThemeChange("light")}
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${
                  theme === "light"
                    ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                    : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    theme === "light"
                      ? accentClasses.baseClass
                      : themeClasses.radioBorder
                  }`}>
                    {theme === "light" && (
                      <div className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </div>
                  <span className="text-sm font-medium">Light Mode</span>
                </div>
              </button>
              <button
                onClick={() => onThemeChange("dark")}
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${
                  theme === "dark"
                    ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                    : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    theme === "dark"
                      ? accentClasses.baseClass
                      : themeClasses.radioBorder
                  }`}>
                    {theme === "dark" && (
                      <div className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </div>
                  <span className="text-sm font-medium">Dark Mode</span>
                </div>
              </button>
              <button
                onClick={() => onThemeChange("slate")}
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${
                  theme === "slate"
                    ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                    : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    theme === "slate"
                      ? accentClasses.baseClass
                      : themeClasses.radioBorder
                  }`}>
                    {theme === "slate" && (
                      <div className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </div>
                  <span className="text-sm font-medium">Slate</span>
                </div>
              </button>
              <button
                onClick={() => onThemeChange("editor")}
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${
                  theme === "editor"
                    ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                    : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    theme === "editor"
                      ? accentClasses.baseClass
                      : themeClasses.radioBorder
                  }`}>
                    {theme === "editor" && (
                      <div className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </div>
                  <span className="text-sm font-medium">Editor</span>
                </div>
              </button>
              <button
                onClick={() => onThemeChange("violet")}
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${
                  theme === "violet"
                    ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                    : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    theme === "violet"
                      ? accentClasses.baseClass
                      : themeClasses.radioBorder
                  }`}>
                    {theme === "violet" && (
                      <div className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </div>
                  <span className="text-sm font-medium">Violet</span>
                </div>
              </button>
            </div>
          </section>

          {/* Divider */}
          <div className={`border-t ${themeClasses.divider}`} />

          {/* Accent Color Setting */}
          <section>
            <div className="mb-4">
              <h2 className={`text-lg font-semibold mb-1 ${themeClasses.text}`}>Accent Color</h2>
              <p className={`text-xs ${themeClasses.textSecondary}`}>
                Choose your preferred accent color
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {(["yellow", "blue", "green", "purple", "pink", "orange", "cyan", "red"] as AccentColor[]).map((color) => {
                const colorClasses = getAccentColorClasses(color);
                return (
                  <button
                    key={color}
                    onClick={() => onAccentColorChange(color)}
                    className={`relative aspect-square rounded-lg border-2 transition-all ${
                      accentColor === color
                        ? `${colorClasses.baseClass} ${colorClasses.lightClass}`
                        : `${themeClasses.border} ${themeClasses.sectionBg} ${themeClasses.hoverBg}`
                    }`}
                  >
                    <div className={`w-full h-full rounded-md ${colorClasses.bgClass}`} />
                    {accentColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className={`w-6 h-6 ${colorClasses.textClass}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Divider */}
          <div className={`border-t ${themeClasses.divider}`} />

          {/* Logout */}
          <section>
            <button
              onClick={onLogout}
              className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all text-red-400 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50`}
            >
              Logout
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
