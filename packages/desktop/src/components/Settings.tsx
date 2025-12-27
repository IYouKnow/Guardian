import { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface SettingsProps {
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  itemSize: "small" | "medium" | "large";
  onItemSizeChange: (size: "small" | "medium" | "large") => void;
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
}

export default function Settings({ viewMode, onViewModeChange, theme, onThemeChange, itemSize, onItemSizeChange, accentColor, onAccentColorChange }: SettingsProps) {
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
        border: "border-gray-200",
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
        border: "border-gray-800",
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
        border: "border-[#333333]",
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
        border: "border-[#4a3a6b]",
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
        border: "border-white/10",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <div className={`flex-1 overflow-y-auto overflow-x-hidden ${themeClasses.bg} ${themeClasses.text}`}>
      <div className="max-w-4xl mx-auto min-w-0 px-8 py-12">
        {/* Header */}
        <div className="mb-16">
          <h1 className={`text-4xl font-bold mb-3 ${themeClasses.text}`}>Settings</h1>
          <p className={`text-base ${themeClasses.textSecondary}`}>Manage your password manager preferences</p>
        </div>

        <div className="space-y-16">
          {/* Theme Setting */}
          <section>
            <div className="mb-6">
              <h2 className={`text-2xl font-semibold mb-2 ${themeClasses.text}`}>Theme</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                Customize the appearance of your password manager
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => onThemeChange("light")}
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${theme === "light"
                  ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                  : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${theme === "light"
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
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${theme === "dark"
                  ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                  : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${theme === "dark"
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
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${theme === "slate"
                  ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                  : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${theme === "slate"
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
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${theme === "editor"
                  ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                  : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${theme === "editor"
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
                className={`w-full text-left px-4 py-3.5 rounded-lg transition-all ${theme === "violet"
                  ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                  : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${theme === "violet"
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
            <div className="mb-6">
              <h2 className={`text-2xl font-semibold mb-2 ${themeClasses.text}`}>Accent Color</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                Choose your preferred accent color for buttons and highlights
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {(["yellow", "blue", "green", "purple", "pink", "orange", "cyan", "red"] as AccentColor[]).map((color) => {
                const colorClasses = getAccentColorClasses(color);
                return (
                  <button
                    key={color}
                    onClick={() => onAccentColorChange(color)}
                    className={`relative aspect-square rounded-lg border-2 transition-all ${accentColor === color
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

          {/* Display Preferences */}
          <section>
            <div className="mb-6">
              <h2 className={`text-2xl font-semibold mb-2 ${themeClasses.text}`}>Display Preferences</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                Customize how your passwords are displayed in the main view
              </p>
            </div>

            <div className="space-y-8">
              {/* View Mode */}
              <div>
                <label className={`block text-sm font-medium mb-4 ${themeClasses.text}`}>
                  View Mode
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => onViewModeChange("grid")}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${viewMode === "grid"
                      ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                      : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                      }`}
                  >
                    Grid View
                  </button>
                  <button
                    onClick={() => onViewModeChange("table")}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${viewMode === "table"
                      ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                      : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                      }`}
                  >
                    Table View
                  </button>
                </div>
              </div>

              {/* Item Size */}
              <div>
                <label className={`block text-sm font-medium mb-4 ${themeClasses.text}`}>
                  Item Size
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => onItemSizeChange("small")}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${itemSize === "small"
                      ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                      : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                      }`}
                  >
                    Small
                  </button>
                  <button
                    onClick={() => onItemSizeChange("medium")}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${itemSize === "medium"
                      ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                      : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                      }`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => onItemSizeChange("large")}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${itemSize === "large"
                      ? `${themeClasses.activeBg} ${themeClasses.activeText}`
                      : `${themeClasses.sectionBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                      }`}
                  >
                    Large
                  </button>
                </div>
              </div>

              {/* Info Box - More Subtle */}
              <div className={`${themeClasses.sectionBg} rounded-lg p-5 mt-6`}>
                <p className={`text-sm ${themeClasses.textSecondary} leading-relaxed`}>
                  <span className={`font-medium ${themeClasses.text}`}>Grid View</span> displays passwords as cards in a grid layout, ideal for visual browsing.{" "}
                  <span className={`font-medium ${themeClasses.text}`}>Table View</span> shows passwords in a compact table format with columns for detailed information.
                </p>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className={`border-t ${themeClasses.divider}`} />

          {/* Security Section */}
          <section>
            <div className="mb-6">
              <h2 className={`text-2xl font-semibold mb-2 ${themeClasses.text}`}>Security</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                Security and encryption settings
              </p>
            </div>
            <p className={`text-sm ${themeClasses.textTertiary}`}>More security options coming soon...</p>
          </section>

          {/* Divider */}
          <div className={`border-t ${themeClasses.divider}`} />

          {/* General Section */}
          <section>
            <div className="mb-6">
              <h2 className={`text-2xl font-semibold mb-2 ${themeClasses.text}`}>General</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>
                General application preferences
              </p>
            </div>
            <p className={`text-sm ${themeClasses.textTertiary}`}>More general options coming soon...</p>
          </section>
        </div>
      </div>
    </div>
  );
}
