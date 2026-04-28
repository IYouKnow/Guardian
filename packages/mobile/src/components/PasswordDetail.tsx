import { useState } from "react";
import type { PasswordEntry } from "../types";
import type { MobileTheme } from "../utils/theme";
import { getThemeClasses } from "../utils/theme";
import { getAccentColorClasses, type AccentColor } from "@guardian/shared/themes";

type Props = {
  password: PasswordEntry;
  theme: MobileTheme;
  accentColor: AccentColor;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
};

export default function PasswordDetail({
  password,
  theme,
  accentColor,
  onBack,
  onEdit,
  onDelete,
  onCopyUsername,
  onCopyPassword,
}: Props) {
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);
  const [iconFailed, setIconFailed] = useState(false);

  return (
    <div className={`flex flex-col h-full ${themeClasses.bg} ${themeClasses.text}`}>
      <div className="flex items-center justify-between gap-4 px-4 pb-4 pt-12">
        <button
          onClick={onBack}
          className={`p-2 rounded-xl ${themeClasses.hoverBg} ${themeClasses.textSecondary} active:scale-95 transition-all`}
          title="Back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className={`w-12 h-12 shrink-0 rounded-2xl border ${themeClasses.border} overflow-hidden flex items-center justify-center ${accentClasses.lightClass} ${accentClasses.textClass} font-bold`}>
            {password.favicon && !iconFailed ? (
              <img
                src={password.favicon}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setIconFailed(true)}
              />
            ) : (
              (password.title || "?").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold truncate">{password.title}</h2>
            <p className={`text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted} truncate mt-0.5`}>
              {password.website || "No website"}
            </p>
          </div>
        </div>

        <button
          onClick={onEdit}
          className={`p-2 rounded-xl border ${themeClasses.border} ${themeClasses.cardBg} ${accentClasses.textClass} active:scale-95 transition-all`}
          title="Edit"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <div className={`${themeClasses.card} border ${themeClasses.border} rounded-2xl p-4 shadow-sm`}>
          <div className="space-y-4">
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Username</p>
              <div className="mt-2 flex items-center gap-2">
                <div className={`flex-1 ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-2`}>
                  <p className="text-sm truncate">{password.username || "—"}</p>
                </div>
                <button
                  onClick={onCopyUsername}
                  className={`p-2 rounded-xl ${themeClasses.hoverBg} ${accentClasses.textClass} active:scale-95 transition-all`}
                  title="Copy username"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Password</p>
              <div className="mt-2 flex items-center gap-2">
                <div className={`flex-1 ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-2`}>
                  <p className={`text-sm font-mono ${themeClasses.textTertiary}`}>••••••••••</p>
                </div>
                <button
                  onClick={onCopyPassword}
                  className={`p-2 rounded-xl ${themeClasses.hoverBg} ${accentClasses.textClass} active:scale-95 transition-all`}
                  title="Copy password"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Notes</p>
              <div className={`mt-2 ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-2`}>
                <p className={`text-sm whitespace-pre-wrap ${password.notes ? themeClasses.text : themeClasses.textMuted}`}>
                  {password.notes || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onDelete}
          className="mt-4 w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl py-3 px-4 font-semibold transition-all active:scale-[0.99]"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
