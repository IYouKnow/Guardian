import type { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

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
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-[#fafafa]",
        cardBg: "bg-gray-100",
        border: "border-gray-300",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
        inputBg: "bg-gray-200",
      };
    } else if (theme === "slate") {
      return {
        bg: "bg-gray-900",
        cardBg: "bg-gray-800",
        border: "border-gray-700",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        inputBg: "bg-gray-800",
      };
    } else if (theme === "editor") {
      return {
        bg: "bg-[#1e1e1e]",
        cardBg: "bg-[#252526]",
        border: "border-[#3e3e42]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-[#858585]",
        inputBg: "bg-[#2a2d2e]",
      };
    } else if (theme === "violet") {
      return {
        bg: "bg-[#282a36]",
        cardBg: "bg-[#44475a]",
        border: "border-[#6272a4]/60",
        text: "text-[#f8f8f2]",
        textSecondary: "text-[#c9a0dc]",
        inputBg: "bg-[#44475a]",
      };
    } else {
      // dark (default)
      return {
        bg: "bg-black",
        cardBg: "bg-[#0a0a0a]",
        border: "border-[#1a1a1a]",
        text: "text-white",
        textSecondary: "text-gray-400",
        inputBg: "bg-[#1a1a1a]",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <div className={`flex flex-col h-full ${themeClasses.bg} ${themeClasses.text}`}>
      {/* Header with back button */}
      <header className={`${themeClasses.cardBg} border-b ${themeClasses.border} px-4 py-3 flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-1.5 ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors`}
            title="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className={`text-base font-semibold ${themeClasses.text}`}>Password Details</h2>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center mb-6">
          {/* Icon/Image */}
          <div className="relative mb-4">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${accentClasses.lightClass} border-2 ${accentClasses.borderClass} flex items-center justify-center ${accentClasses.textClass} font-bold text-3xl shadow-lg`}>
              {password.title.charAt(0).toUpperCase()}
            </div>
            {password.breached && (
              <div className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 ${theme === "light" ? "border-white" : "border-[#0a0a0a]"}`}>
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className={`text-xl font-bold ${themeClasses.text} mb-1 text-center`}>{password.title}</h1>
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Username */}
          <div>
            <label className={`block text-xs font-medium ${themeClasses.textSecondary} mb-2`}>
              Username
            </label>
            <div className={`${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-3 py-2.5 flex items-center gap-2`}>
              <span className={`flex-1 text-sm ${themeClasses.text} break-all`}>
                {password.username || "No username"}
              </span>
              <button
                onClick={onCopyUsername}
                className={`p-1.5 ${themeClasses.textSecondary} ${accentClasses.hoverTextClass} ${accentClasses.hoverBgClass} rounded transition-all flex-shrink-0`}
                title="Copy username"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={`block text-xs font-medium ${themeClasses.textSecondary} mb-2`}>
              Password
            </label>
            <div className={`${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-3 py-2.5 flex items-center gap-2`}>
              <span className={`flex-1 text-sm font-mono ${themeClasses.text} break-all`}>
                {password.password}
              </span>
              <button
                onClick={onCopyPassword}
                className={`p-1.5 ${themeClasses.textSecondary} ${accentClasses.hoverTextClass} ${accentClasses.hoverBgClass} rounded transition-all flex-shrink-0`}
                title="Copy password"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Website (if available) */}
          {password.website && (
            <div>
              <label className={`block text-xs font-medium ${themeClasses.textSecondary} mb-2`}>
                Website
              </label>
              <div className={`${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-3 py-2.5`}>
                <span className={`text-sm ${themeClasses.text} break-all`}>
                  {password.website}
                </span>
              </div>
            </div>
          )}

          {/* Notes (if available) */}
          {password.notes && (
            <div>
              <label className={`block text-xs font-medium ${themeClasses.textSecondary} mb-2`}>
                Notes
              </label>
              <div className={`${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-3 py-2.5`}>
                <span className={`text-sm ${themeClasses.text} break-all whitespace-pre-wrap`}>
                  {password.notes}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

