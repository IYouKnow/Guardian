import { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface PasswordTableProps {
  passwords: PasswordEntry[];
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  theme: Theme;
  itemSize: "small" | "medium" | "large";
  accentColor: AccentColor;
}

export default function PasswordTable({
  passwords,
  onCopyUsername,
  onCopyPassword,
  theme,
  itemSize,
  accentColor,
}: PasswordTableProps) {
  const getSizeClasses = () => {
    if (itemSize === "small") {
      return {
        headerPadding: "py-2 px-3",
        cellPadding: "py-2 px-3",
        iconSize: "w-8 h-8",
        iconText: "text-sm",
        textSize: "text-xs",
        headerTextSize: "text-xs",
        gap: "gap-2",
      };
    } else if (itemSize === "large") {
      return {
        headerPadding: "py-4 px-4",
        cellPadding: "py-5 px-4",
        iconSize: "w-12 h-12",
        iconText: "text-lg",
        textSize: "text-sm",
        headerTextSize: "text-sm",
        gap: "gap-4",
      };
    } else {
      return {
        headerPadding: "py-3 px-4",
        cellPadding: "py-4 px-4",
        iconSize: "w-10 h-10",
        iconText: "text-base",
        textSize: "text-sm",
        headerTextSize: "text-xs",
        gap: "gap-3",
      };
    }
  };

  const sizeClasses = getSizeClasses();
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        border: "border-gray-300",
        hoverBg: "hover:bg-gray-200",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-500",
        headerText: "text-gray-500",
        badgeBg: "bg-gray-200",
        badgeText: "text-gray-700",
        iconBorder: "",
      };
    } else if (theme === "slate") {
      return {
        border: "border-gray-700",
        hoverBg: "hover:bg-gray-800",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        headerText: "text-gray-500",
        badgeBg: "bg-gray-700",
        badgeText: "text-gray-300",
        iconBorder: "",
      };
    } else if (theme === "editor") {
      return {
        border: "border-[#3e3e42]",
        hoverBg: "hover:bg-[#252526]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-[#858585]",
        textTertiary: "text-[#6a6a6a]",
        headerText: "text-[#6a6a6a]",
        badgeBg: "bg-[#2a2d2e]",
        badgeText: "text-[#858585]",
        iconBorder: "",
      };
    } else if (theme === "violet") {
      return {
        border: "border-[#6272a4]/60",
        hoverBg: "hover:bg-[#44475a]",
        text: "text-[#f8f8f2]",
        textSecondary: "text-[#c9a0dc]",
        textTertiary: "text-[#6272a4]",
        headerText: "text-[#6272a4]",
        badgeBg: "bg-[#282a36]",
        badgeText: "text-[#c9a0dc]",
        iconBorder: "",
      };
    } else {
      // dark (default)
      return {
        border: "border-[#1a1a1a]",
        hoverBg: "hover:bg-[#0a0a0a]",
        text: "text-white",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        headerText: "text-gray-500",
        badgeBg: "bg-[#1a1a1a]",
        badgeText: "text-gray-400",
        iconBorder: "",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <div className="w-full overflow-x-auto min-w-0">
      <table className="w-full border-collapse min-w-full">
        <thead>
          <tr className={`border-b ${themeClasses.border}`}>
            <th className={`text-left ${sizeClasses.headerPadding} ${sizeClasses.headerTextSize} font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Service</th>
            <th className={`text-left ${sizeClasses.headerPadding} ${sizeClasses.headerTextSize} font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Username</th>
            <th className={`text-left ${sizeClasses.headerPadding} ${sizeClasses.headerTextSize} font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Website</th>
            <th className={`text-left ${sizeClasses.headerPadding} ${sizeClasses.headerTextSize} font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Password</th>
            <th className={`text-left ${sizeClasses.headerPadding} ${sizeClasses.headerTextSize} font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Category</th>
          </tr>
        </thead>
        <tbody>
          {passwords.map((password) => (
            <tr
              key={password.id}
              className={`border-b ${themeClasses.border} ${themeClasses.hoverBg} transition-colors group`}
            >
              <td className={sizeClasses.cellPadding}>
                <div className={`flex items-center ${sizeClasses.gap}`}>
                  <div className={`${sizeClasses.iconSize} rounded-lg bg-gradient-to-br ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center ${accentClasses.textClass} font-bold ${sizeClasses.iconText}`}>
                    {password.title.charAt(0).toUpperCase()}
                  </div>
                  <span className={`font-medium ${themeClasses.text} ${sizeClasses.textSize}`}>{password.title}</span>
                </div>
              </td>
              <td className={sizeClasses.cellPadding}>
                <div className={`flex items-center ${sizeClasses.gap} group/username`}>
                  <span className={`${themeClasses.textSecondary} ${sizeClasses.textSize}`}>{password.username}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyUsername(password.username);
                    }}
                    className={`opacity-0 group-hover/username:opacity-100 p-1.5 text-gray-500 ${accentClasses.hoverTextClass} ${accentClasses.hoverBgClass} rounded transition-all`}
                    title="Copy username"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </td>
              <td className={`${sizeClasses.cellPadding} ${themeClasses.textSecondary} ${sizeClasses.textSize}`}>{password.website}</td>
              <td className={sizeClasses.cellPadding}>
                <div className={`flex items-center ${sizeClasses.gap} group/password`}>
                  <span className={`${themeClasses.textTertiary} font-mono ${sizeClasses.textSize}`}>••••••••</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyPassword(password.password);
                    }}
                    className={`opacity-0 group-hover/password:opacity-100 p-1.5 text-gray-500 ${accentClasses.hoverTextClass} ${accentClasses.hoverBgClass} rounded transition-all`}
                    title="Copy password"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </td>
              <td className={sizeClasses.cellPadding}>
                <span className={`px-2 py-1 ${themeClasses.badgeBg} ${themeClasses.badgeText} ${sizeClasses.textSize} rounded`}>{password.category || "-"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
