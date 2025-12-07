import type { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface PasswordCardProps {
  password: PasswordEntry;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function PasswordCard({
  password,
  onCopyUsername,
  onCopyPassword,
  theme,
  accentColor,
}: PasswordCardProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        cardBg: "bg-gray-100",
        cardBgGradient: "from-gray-100 to-gray-200",
        border: "border-gray-400",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-500",
      };
    } else if (theme === "slate") {
      return {
        cardBg: "bg-gray-800",
        cardBgGradient: "from-gray-800 to-gray-900",
        border: "border-gray-600",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
      };
    } else if (theme === "editor") {
      return {
        cardBg: "bg-[#252526]",
        cardBgGradient: "from-[#252526] to-[#2a2d2e]",
        border: "border-[#3e3e42]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-[#858585]",
        textTertiary: "text-[#6a6a6a]",
      };
    } else if (theme === "violet") {
      return {
        cardBg: "bg-[#44475a]",
        cardBgGradient: "from-[#44475a] to-[#282a36]",
        border: "border-[#6272a4]/60",
        text: "text-[#f8f8f2]",
        textSecondary: "text-[#c9a0dc]",
        textTertiary: "text-[#6272a4]",
      };
    } else {
      // dark (default)
      return {
        cardBg: "bg-[#0a0a0a]",
        cardBgGradient: "from-[#0a0a0a] to-[#111111]",
        border: "border-[#1a1a1a]",
        text: "text-white",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <div className={`bg-gradient-to-br ${themeClasses.cardBgGradient} rounded-xl border ${themeClasses.border} ${accentClasses.hoverBorderClass} hover:shadow-lg ${accentClasses.hoverShadowClass} transition-all group relative`}>
      <div className="p-4">
        {/* Header with icon and title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentClasses.lightClass} border-2 ${accentClasses.borderClass} flex items-center justify-center ${accentClasses.textClass} font-bold text-lg shadow-lg`}>
              {password.title.charAt(0).toUpperCase()}
            </div>
            {password.breached && (
              <div className={`absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 ${theme === "light" ? "border-white" : "border-[#0a0a0a]"}`}>
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <h3 className={`font-bold ${themeClasses.text} text-sm truncate`}>{password.title}</h3>
        </div>

        {/* Username with hover copy icon */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <p className={`text-xs ${themeClasses.textSecondary} truncate flex-1`}>{password.username || "No username"}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyUsername();
              }}
              className={`opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 ${accentClasses.hoverTextClass} ${accentClasses.hoverBgClass} rounded-lg transition-all`}
              title="Copy username"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Password with hover copy icon */}
        <div className="flex items-center gap-2">
          <p className={`text-xs ${themeClasses.textTertiary} font-mono flex-1`}>••••••••</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyPassword();
            }}
            className={`opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 ${accentClasses.hoverTextClass} ${accentClasses.hoverBgClass} rounded-lg transition-all`}
            title="Copy password"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

