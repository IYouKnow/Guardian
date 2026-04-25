import type { PasswordEntry } from "../types";
import { getAccentColorClasses } from "@guardian/shared/themes";
import { getThemeClasses, toSharedTheme, type MobileTheme } from "../utils/theme";

interface PasswordCardProps {
  password: PasswordEntry;
  onCardClick: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onDelete: () => void;
  theme?: MobileTheme;
}

export default function PasswordCard({
  password,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme = "dark",
}: PasswordCardProps) {
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses("yellow", toSharedTheme(theme));

  return (
    <div
      onClick={onCardClick}
      className={`group ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl transition-all shadow-sm active:scale-[0.99] cursor-pointer`}
    >
      <div className="p-3 flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center ${accentClasses.textClass} font-bold text-sm shadow-inner`}
          >
            {password.title.charAt(0).toUpperCase()}
          </div>
          {password.breached && (
            <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 ${themeClasses.border}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold ${themeClasses.text} text-sm truncate`}>{password.title}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`p-2 rounded-xl ${themeClasses.hoverBg} ${themeClasses.textSecondary} active:scale-95 transition-all`}
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>

          <p className={`text-[11px] ${themeClasses.textSecondary} truncate mt-0.5`}>
            {password.website || "No website"}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-[11px] ${themeClasses.textMuted} truncate`}>{password.username || "No username"}</p>
              <p className={`text-[11px] ${themeClasses.textTertiary} font-mono mt-0.5`}>••••••••••</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyUsername();
                }}
                className={`p-2 rounded-xl ${themeClasses.hoverBg} ${accentClasses.textClass} active:scale-95 transition-all`}
                title="Copy username"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyPassword();
                }}
                className={`p-2 rounded-xl ${themeClasses.hoverBg} ${accentClasses.textClass} active:scale-95 transition-all`}
                title="Copy password"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
