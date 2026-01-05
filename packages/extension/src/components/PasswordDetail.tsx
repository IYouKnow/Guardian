import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  revealCensorSeconds?: number;
}

export default function PasswordDetail({
  password,
  onCopyUsername,
  onCopyPassword,
  onBack,
  theme,
  accentColor,
  revealCensorSeconds = 5,
}: PasswordDetailProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor);

  const handleCopyUser = () => {
    onCopyUsername();
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 2000);
  };

  const handleCopyPass = () => {
    onCopyPassword();
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${themeClasses.bg} ${themeClasses.text} font-sans`}>
      {/* Modern Header - Horizontal */}
      <div className="pt-6 pb-6 px-6 flex items-center gap-4 shrink-0">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center shadow-lg shrink-0`}>
          <span className={`text-2xl font-bold ${accentClasses.textClass}`}>
            {password.title.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h1 className="text-xl font-bold tracking-tight truncate">{password.title}</h1>
          <p className={`text-xs ${themeClasses.textTertiary} mt-0.5 font-medium tracking-wide uppercase truncate`}>
            {password.website || "No Website"}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide space-y-5">

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopyUser}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl ${themeClasses.inputBg} border ${themeClasses.border} hover:border-${accentColor}-400/50 hover:bg-${accentColor}-400/5 transition-all group`}
          >
            <div className={`p-2 rounded-full ${themeClasses.bg} group-hover:bg-${accentColor}-400/20 text-${accentColor}-400 transition-colors relative`}>
              <AnimatePresence mode="wait">
                {copiedUser ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <svg className={`w-5 h-5 ${themeClasses.textSecondary} group-hover:${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="text-[10px] font-semibold text-center opacity-70 group-hover:opacity-100">
              {copiedUser ? "Copied!" : "Copy User"}
            </span>
          </button>

          <button
            onClick={handleCopyPass}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl ${themeClasses.inputBg} border ${themeClasses.border} hover:border-${accentColor}-400/50 hover:bg-${accentColor}-400/5 transition-all group`}
          >
            <div className={`p-2 rounded-full ${themeClasses.bg} group-hover:bg-${accentColor}-400/20 text-${accentColor}-400 transition-colors relative`}>
              <AnimatePresence mode="wait">
                {copiedPass ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <svg className={`w-5 h-5 ${themeClasses.textSecondary} group-hover:${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="text-[10px] font-semibold text-center opacity-70 group-hover:opacity-100">
              {copiedPass ? "Copied!" : "Copy Pass"}
            </span>
          </button>
        </div>

        {/* Credentials Card */}
        <div className={`rounded-2xl border ${themeClasses.border} overflow-hidden`}>
          {/* Username Row */}
          <div className={`p-3 flex items-center justify-between border-b ${themeClasses.border} ${themeClasses.inputBg}/50`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-transparent`}>
                <svg className={`w-4 h-4 ${themeClasses.textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Username / Email</span>
                <span className="text-xs truncate font-medium select-all">{password.username || "—"}</span>
              </div>
            </div>
          </div>

          {/* Password Row */}
          <div className={`p-3 flex items-center justify-between ${themeClasses.inputBg}/50 relative`}>
            <div className="flex items-center gap-3 overflow-hidden w-full">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-transparent`}>
                <svg className={`w-4 h-4 ${themeClasses.textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Password</span>
                <div className="flex items-center justify-between">
                  <span className={`text-xs truncate font-mono font-medium ${showPassword ? "" : "blur-sm opacity-60"} transition-all duration-300 select-none`}>
                    {password.password}
                  </span>
                  <button
                    onClick={() => {
                      const nextState = !showPassword;
                      setShowPassword(nextState);
                      if (nextState) {
                        // Only auto-hide if setting is > 0 (0 means never)
                        if (revealCensorSeconds > 0) {
                          setTimeout(() => setShowPassword(false), revealCensorSeconds * 1000);
                        }
                      }
                    }}
                    className={`p-1.5 rounded-md ${themeClasses.hoverBg} ${themeClasses.textTertiary} hover:${themeClasses.activeText} transition-colors`}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {password.passwordStrength && (
            <div className={`h-1 w-full flex`}>
              <div className={`h-full flex-1 ${password.passwordStrength === 'weak' ? 'bg-red-500' : 'bg-green-500'} opacity-50`}></div>
              <div className={`h-full flex-1 ${['medium', 'strong', 'very-strong'].includes(password.passwordStrength) ? 'bg-green-500' : 'bg-transparent'} opacity-50`}></div>
              <div className={`h-full flex-1 ${['strong', 'very-strong'].includes(password.passwordStrength) ? 'bg-green-500' : 'bg-transparent'} opacity-50`}></div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        {(password.website || password.notes) && (
          <div className="space-y-4">
            {password.website && (
              <a
                href={password.website.startsWith('http') ? password.website : `https://${password.website}`}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-3 p-3 rounded-xl ${themeClasses.inputBg} border ${themeClasses.border} group hover:border-${accentColor}-400/50 transition-all`}
              >
                <div className={`p-2 rounded-lg bg-${accentColor}-400/10 text-${accentColor}-400 group-hover:bg-${accentColor}-400 group-hover:text-black transition-all`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Website</p>
                  <p className="text-xs truncate font-medium group-hover:underline">{password.website}</p>
                </div>
                <svg className={`w-4 h-4 ${themeClasses.textTertiary} group-hover:${themeClasses.activeText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}

            {password.notes && (
              <div className={`p-4 rounded-xl ${themeClasses.inputBg} border ${themeClasses.border}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Notes</p>
                <p className={`text-xs ${themeClasses.textSecondary} whitespace-pre-wrap leading-relaxed font-mono`}>{password.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Delete / Danger Zone (Placeholder for future) */}
      </div>
    </div>
  );
}
