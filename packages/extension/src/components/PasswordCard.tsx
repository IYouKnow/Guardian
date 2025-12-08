import type { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface PasswordCardProps {
  password: PasswordEntry;
  onCardClick: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function PasswordCard({
  password,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  theme,
  accentColor,
}: PasswordCardProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        cardBg: "bg-gray-100",
        border: "border-gray-300",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
      };
    } else if (theme === "slate") {
      return {
        cardBg: "bg-gray-800",
        border: "border-gray-700",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
      };
    } else if (theme === "editor") {
      return {
        cardBg: "bg-[#252526]",
        border: "border-[#3e3e42]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-[#858585]",
      };
    } else if (theme === "violet") {
      return {
        cardBg: "bg-[#44475a]",
        border: "border-[#6272a4]/60",
        text: "text-[#f8f8f2]",
        textSecondary: "text-[#c9a0dc]",
      };
    } else {
      // dark (default)
      return {
        cardBg: "bg-[#0a0a0a]",
        border: "border-[#1a1a1a]",
        text: "text-white",
        textSecondary: "text-gray-400",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <div 
      onClick={onCardClick}
      className={`group ${themeClasses.cardBg} rounded-lg border ${themeClasses.border} ${accentClasses.hoverBorderClass} hover:shadow-md transition-all cursor-pointer active:scale-[0.98]`}
    >
      <div className="p-3 flex items-center gap-3">
        {/* Icon/Image */}
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center ${accentClasses.textClass} font-bold text-base shadow-sm`}>
            {password.title.charAt(0).toUpperCase()}
          </div>
          {password.breached && (
            <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center border-2 ${theme === "light" ? "border-white" : "border-[#0a0a0a]"}`}>
              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Title and Username */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${themeClasses.text} text-sm truncate mb-0.5`}>{password.title}</h3>
          <p className={`text-xs ${themeClasses.textSecondary} truncate`}>{password.username || "No username"}</p>
        </div>

        {/* Copy buttons on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyUsername();
            }}
            className={`p-1.5 ${themeClasses.textSecondary} ${accentClasses.hoverTextClass} ${accentClasses.hoverBgClass} rounded transition-all`}
            title="Copy username"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

