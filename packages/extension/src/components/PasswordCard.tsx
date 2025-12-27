import type { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { motion } from "framer-motion";

interface PasswordCardProps {
  password: PasswordEntry;
  onCardClick: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  theme: Theme;
  accentColor: AccentColor;
  isActive?: boolean;
}

export default function PasswordCard({
  password,
  onCardClick,
  onCopyUsername,
  onCopyPassword,
  theme,
  accentColor,
  isActive = false,
}: PasswordCardProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        cardBg: "bg-white",
        sectionBg: "bg-gray-50",
        border: "border-gray-100",
        text: "text-gray-800",
        textSecondary: "text-gray-500",
        hoverBg: "hover:bg-gray-100/50",
      };
    } else if (theme === "slate") {
      return {
        cardBg: "bg-slate-800/40",
        sectionBg: "bg-slate-900/50",
        border: "border-slate-800",
        text: "text-slate-100",
        textSecondary: "text-slate-400",
        hoverBg: "hover:bg-slate-800/50",
      };
    } else if (theme === "editor") {
      return {
        cardBg: "bg-[#252526]/40",
        sectionBg: "bg-[#1e1e1e]",
        border: "border-[#333333]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-gray-400",
        hoverBg: "hover:bg-[#2a2d2e]/70",
      };
    } else if (theme === "violet") {
      return {
        cardBg: "bg-[#24283b]/40",
        sectionBg: "bg-[#16161e]",
        border: "border-[#414868]/30",
        text: "text-[#a9b1d6]",
        textSecondary: "text-gray-400",
        hoverBg: "hover:bg-[#414868]/30",
      };
    } else {
      return {
        cardBg: "bg-[#0a0a0a]",
        sectionBg: "bg-black",
        border: "border-white/10",
        text: "text-white",
        textSecondary: "text-gray-400",
        hoverBg: "hover:bg-white/10",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onCardClick}
      className={`group ${isActive ? `${themeClasses.cardBg} ring-1 ${accentClasses.focusRingClass} border-transparent` : `${themeClasses.cardBg} border ${themeClasses.border}`} rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md`}
    >
      <div className="p-2 flex items-center gap-3">
        {/* Icon/Image */}
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center ${accentClasses.textClass} font-bold text-xs shadow-inner`}>
            {password.title.charAt(0).toUpperCase()}
          </div>
          {password.breached && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full flex items-center justify-center border-2 border-black">
              <div className="w-0.5 h-0.5 bg-white rounded-full" />
            </div>
          )}
        </div>

        {/* Title and Username */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${themeClasses.text} text-xs truncate group-hover:${accentClasses.textClass} transition-colors`}>{password.title}</h3>
          <p className={`text-[10px] ${themeClasses.textSecondary} truncate mt-0.5`}>{password.username || "No username"}</p>
        </div>

        {/* Action icons on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyUsername();
            }}
            className={`p-1.5 rounded-lg ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${accentClasses.textClass} transition-all active:scale-95`}
            title="Copy Username"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyPassword();
            }}
            className={`p-1.5 rounded-lg ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${accentClasses.textClass} transition-all active:scale-95`}
            title="Copy Password"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
