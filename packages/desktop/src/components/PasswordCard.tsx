import { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { motion } from "framer-motion";

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
    switch (itemSize) {
      case "small":
        return {
          padding: "p-4",
          iconSize: "w-8 h-8",
          iconText: "text-xs",
          titleSize: "text-sm",
          textSize: "text-[0.65rem]",
          spacing: "gap-2.5",
        };
      case "large":
        return {
          padding: "p-7",
          iconSize: "w-14 h-14",
          iconText: "text-lg",
          titleSize: "text-lg",
          textSize: "text-xs",
          spacing: "gap-4",
        };
      default: // medium
        return {
          padding: "p-6",
          iconSize: "w-11 h-11",
          iconText: "text-base",
          titleSize: "text-base",
          textSize: "text-[0.7rem]",
          spacing: "gap-3.5",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const getThemeClasses = () => {
    switch (theme) {
      case "light":
        return {
          card: "bg-white/60",
          item: "bg-slate-100/50",
          text: "text-slate-900",
          textMuted: "text-slate-500",
          border: "border-slate-200",
        };
      case "slate":
        return {
          card: "bg-slate-900/40",
          item: "bg-slate-800/40",
          text: "text-slate-100",
          textMuted: "text-slate-400",
          border: "border-slate-800",
        };
      case "editor":
        return {
          card: "bg-[#1a1a1a]/40",
          item: "bg-[#252526]/40",
          text: "text-[#d4d4d4]",
          textMuted: "text-[#858585]",
          border: "border-[#333333]",
        };
      case "violet":
        return {
          card: "bg-[#23173a]/40",
          item: "bg-[#2d1b4d]/40",
          text: "text-[#f8f8f2]",
          textMuted: "text-[#c9a0dc]/70",
          border: "border-[#4a3a6b]",
        };
      default: // dark
        return {
          card: "bg-[#0a0a0a]/40",
          item: "bg-zinc-900/40",
          text: "text-white",
          textMuted: "text-zinc-500",
          border: "border-zinc-800/50",
        };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor, theme);

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`relative group ${themeClasses.card} backdrop-blur-xl rounded-[1.5rem] border ${themeClasses.border} ${accentClasses.hoverBorderClass} transition-all duration-300 overflow-hidden shadow-xl hover:shadow-2xl ${accentClasses.hoverShadowClass}`}
    >
      <div className={sizeClasses.padding}>
        {/* Top Section */}
        <div className={`flex items-start justify-between ${sizeClasses.spacing} mb-6`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className={`${sizeClasses.iconSize} rounded-xl bg-gradient-to-br ${accentClasses.lightClass} border border-white/5 flex items-center justify-center ${accentClasses.textClass} font-bold ${sizeClasses.iconText} shadow-inner`}>
              {password.title.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className={`font-bold ${themeClasses.text} ${sizeClasses.titleSize} truncate`}>
                {password.title}
              </h3>
              <p className={`text-[0.6rem] font-bold uppercase tracking-widest ${themeClasses.textMuted} opacity-60`}>
                {password.category || "General"}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={`p-2 ${themeClasses.textMuted} hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Credentials Section */}
        <div className="space-y-2.5">
          <div className={`group/item flex items-center justify-between p-3 rounded-xl ${themeClasses.item} border border-white/[0.02] transition-colors`}>
            <div className="min-w-0 flex-1">
              <p className={`text-[0.55rem] font-bold uppercase tracking-wider ${themeClasses.textMuted} mb-0.5`}>Identifier</p>
              <p className={`${sizeClasses.textSize} ${themeClasses.text} truncate font-medium`}>{password.username}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onCopyUsername(); }}
              className={`p-1.5 ${themeClasses.textMuted} group-hover/item:text-white transition-colors`}
              title="Copy"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <div className={`group/item flex items-center justify-between p-3 rounded-xl ${themeClasses.item} border border-white/[0.02] transition-colors`}>
            <div className="min-w-0 flex-1">
              <p className={`text-[0.55rem] font-bold uppercase tracking-wider ${themeClasses.textMuted} mb-0.5`}>Access Key</p>
              <p className={`${sizeClasses.textSize} ${themeClasses.textMuted} font-mono tracking-[0.3em]`}>••••••••</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onCopyPassword(); }}
              className={`p-1.5 ${themeClasses.textMuted} group-hover/item:${accentClasses.textClass} transition-colors`}
              title="Copy"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Security Indicator */}
        <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1 w-4 rounded-full ${i <= 3 ? accentClasses.bgClass : themeClasses.border} opacity-50`} />
            ))}
          </div>
          <span className={`text-[0.5rem] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
            Encrypted
          </span>
        </div>
      </div>
    </motion.div>
  );
}

