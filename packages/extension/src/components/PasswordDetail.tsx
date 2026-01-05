import type { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { getThemeClasses } from "../utils/theme";

interface PasswordDetailProps {
  password: PasswordEntry;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onBack: () => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function PasswordDetail({
  password,
  onCopyUsername,
  onCopyPassword,
  onBack,
  theme,
  accentColor,
}: PasswordDetailProps) {
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <div className={`flex flex-col h-full overflow-hidden ${themeClasses.bg} ${themeClasses.text} font-sans`}>
      {/* Mini Header */}
      <header className={`px-5 py-4 flex items-center justify-between shrink-0 border-b ${themeClasses.border}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center ${accentClasses.textClass} font-bold text-sm shrink-0`}>
            {password.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{password.title}</h1>
            <p className={`text-[10px] ${themeClasses.textTertiary}`}>Account Details</p>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
        {/* BREACH STATUS */}
        {password.breached && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-red-500">Security Alert</p>
              <p className="text-[10px] text-red-500/80 leading-tight">This password was found in a known data breach.</p>
            </div>
          </div>
        )}

        {/* USERNAME SECTION */}
        <section className="space-y-1.5">
          <label className={`block text-[10px] font-medium ${themeClasses.textTertiary} ml-1`}>Username</label>
          <div className={`${themeClasses.inputBg} border ${themeClasses.border} rounded-xl p-3 relative group`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium tracking-wide truncate">{password.username || "None"}</p>
              </div>
              <button
                onClick={onCopyUsername}
                className={`p-2 rounded-lg ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${accentClasses.textClass} transition-all active:scale-90`}
                title="Copy Username"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* PASSWORD SECTION */}
        <section className="space-y-1.5">
          <label className={`block text-[10px] font-medium ${themeClasses.textTertiary} ml-1`}>Password</label>
          <div className={`${themeClasses.inputBg} border ${themeClasses.border} rounded-xl p-3 relative group`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-mono tracking-wider truncate">{password.password}</p>
              </div>
              <button
                onClick={onCopyPassword}
                className={`p-2 rounded-lg ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${accentClasses.textClass} transition-all active:scale-90`}
                title="Copy Password"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* WEBSITE SECTION */}
        {password.website && (
          <section className="space-y-1.5">
            <label className={`block text-[10px] font-medium ${themeClasses.textTertiary} ml-1`}>Website</label>
            <div className={`${themeClasses.inputBg} border ${themeClasses.border} rounded-xl p-3`}>
              <p className="text-sm truncate">{password.website}</p>
            </div>
          </section>
        )}

        {/* NOTES SECTION */}
        {password.notes && (
          <section className="space-y-1.5">
            <label className={`block text-[10px] font-medium ${themeClasses.textTertiary} ml-1`}>Notes</label>
            <div className={`${themeClasses.inputBg} border ${themeClasses.border} rounded-xl p-3`}>
              <p className={`text-xs ${themeClasses.textSecondary} whitespace-pre-wrap leading-relaxed`}>{password.notes}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
