import { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface PasswordCardProps {
  password: PasswordEntry;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onDelete: () => void;
  theme: Theme;
  itemSize: "small" | "medium" | "large";
  accentColor: AccentColor;
}

export default function PasswordCard({
  password,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme,
  itemSize,
  accentColor,
}: PasswordCardProps) {
  const getSizeClasses = () => {
    if (itemSize === "small") {
      return {
        padding: "p-3",
        iconSize: "w-8 h-8",
        iconText: "text-base",
        titleSize: "text-sm",
        textSize: "text-xs",
        gap: "gap-2",
        mb: "mb-2",
      };
    } else if (itemSize === "large") {
      return {
        padding: "p-6",
        iconSize: "w-16 h-16",
        iconText: "text-2xl",
        titleSize: "text-lg",
        textSize: "text-sm",
        gap: "gap-4",
        mb: "mb-5",
      };
    } else {
      return {
        padding: "p-5",
        iconSize: "w-12 h-12",
        iconText: "text-xl",
        titleSize: "text-base",
        textSize: "text-sm",
        gap: "gap-3",
        mb: "mb-4",
      };
    }
  };

  const sizeClasses = getSizeClasses();
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        cardBg: "bg-gray-100",
        cardBgGradient: "from-gray-100 to-gray-200",
        border: "border-gray-400",
        hoverBorder: "hover:border-yellow-400/50",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-500",
        iconBorder: "border-yellow-400/30",
        badgeBg: "bg-gray-200",
        badgeText: "text-gray-700",
      };
    } else if (theme === "slate") {
      return {
        cardBg: "bg-gray-800",
        cardBgGradient: "from-gray-800 to-gray-900",
        border: "border-gray-600",
        hoverBorder: "hover:border-yellow-400/50",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        iconBorder: "border-yellow-400/30",
        badgeBg: "bg-gray-700",
        badgeText: "text-gray-300",
      };
    } else if (theme === "editor") {
      return {
        cardBg: "bg-[#252526]",
        cardBgGradient: "from-[#252526] to-[#2a2d2e]",
        border: "border-[#3e3e42]",
        hoverBorder: "hover:border-yellow-400/50",
        text: "text-[#d4d4d4]",
        textSecondary: "text-[#858585]",
        textTertiary: "text-[#6a6a6a]",
        iconBorder: "border-yellow-400/30",
        badgeBg: "bg-[#2a2d2e]",
        badgeText: "text-[#858585]",
      };
    } else if (theme === "violet") {
      return {
        cardBg: "bg-[#44475a]",
        cardBgGradient: "from-[#44475a] to-[#282a36]",
        border: "border-[#6272a4]/60",
        hoverBorder: "hover:border-yellow-400/50",
        text: "text-[#f8f8f2]",
        textSecondary: "text-[#c9a0dc]",
        textTertiary: "text-[#6272a4]",
        iconBorder: "border-yellow-400/30",
        badgeBg: "bg-[#282a36]",
        badgeText: "text-[#c9a0dc]",
      };
    } else {
      // dark (default)
      return {
        cardBg: "bg-[#0a0a0a]",
        cardBgGradient: "from-[#0a0a0a] to-[#111111]",
        border: "border-[#1a1a1a]",
        hoverBorder: "hover:border-yellow-400/50",
        text: "text-white",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        iconBorder: "border-yellow-400/30",
        badgeBg: "bg-[#1a1a1a]",
        badgeText: "text-gray-400",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <div className={`bg-gradient-to-br ${themeClasses.cardBgGradient} rounded-xl border ${themeClasses.border} ${accentClasses.hoverBorderClass} hover:shadow-lg ${accentClasses.hoverShadowClass} transition-all group relative`}>
      <div className={sizeClasses.padding}>
        {/* Header with icon and title */}
        <div className={`flex items-center ${sizeClasses.gap} ${sizeClasses.mb}`}>
          <div className="relative flex-shrink-0">
            <div className={`${sizeClasses.iconSize} rounded-xl bg-gradient-to-br ${accentClasses.lightClass} border-2 ${accentClasses.borderClass} flex items-center justify-center ${accentClasses.textClass} font-bold ${sizeClasses.iconText} shadow-lg`}>
              {password.title.charAt(0).toUpperCase()}
            </div>
            {password.breached && (
              <div className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 ${theme === "light" ? "border-white" : theme === "slate" ? "border-gray-800" : "border-[#0a0a0a]"}`}>
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <h3 className={`font-bold ${themeClasses.text} ${sizeClasses.titleSize} truncate flex-1`}>{password.title}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="Delete password"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Username with hover copy icon */}
        <div className={itemSize === "small" ? "mb-2" : itemSize === "large" ? "mb-4" : "mb-3"}>
          <div className={`flex items-center ${sizeClasses.gap}`}>
            <p className={`${sizeClasses.textSize} ${themeClasses.textSecondary} truncate flex-1`}>{password.username}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyUsername();
              }}
              className={`opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 ${accentClasses.hoverTextClass} ${accentClasses.hoverBgClass} rounded-lg transition-all`}
              title="Copy username"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Password with hover copy icon */}
        <div className={`flex items-center ${sizeClasses.gap}`}>
          <p className={`${sizeClasses.textSize} ${themeClasses.textTertiary} font-mono flex-1`}>••••••••</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyPassword();
            }}
            className={`opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:${accentClasses.textClass} hover:${accentClasses.lightClass} rounded-lg transition-all`}
            title="Copy password"
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

