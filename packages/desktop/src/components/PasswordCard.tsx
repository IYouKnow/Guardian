import { useState, useRef, useCallback } from "react";
import { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { motion } from "framer-motion";

interface PasswordCardProps {
  password: PasswordEntry;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onDelete: () => void;
  onContextMenu?: (x: number, y: number) => void;
  theme: Theme;
  itemSize: "small" | "medium" | "large";
  accentColor: AccentColor;
}

export default function PasswordCard({
  password,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  onContextMenu,
  theme,
  itemSize,
  accentColor,
}: PasswordCardProps) {
  const getSizeClasses = () => {
    switch (itemSize) {
      case "small":
        return {
          padding: "p-4",
          iconSize: "w-7 h-7",
          iconText: "text-[0.6rem]",
          titleSize: "text-xs",
          textSize: "text-[0.6rem]",
          spacing: "gap-2",
        };
      case "large":
        return {
          padding: "p-7",
          iconSize: "w-11 h-11",
          iconText: "text-sm",
          titleSize: "text-base",
          textSize: "text-xs",
          spacing: "gap-3",
        };
      default: // medium
        return {
          padding: "p-6",
          iconSize: "w-9 h-9",
          iconText: "text-sm",
          titleSize: "text-sm",
          textSize: "text-[0.65rem]",
          spacing: "gap-2.5",
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
  const [faviconFailed, setFaviconFailed] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback((field: 'username' | 'password', handler: () => void) => {
    handler();
    setCopiedField(field);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedField(null), 1500);
  }, []);

  return (
    <motion.div
      layout
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(e.clientX, e.clientY); } : undefined}
      className={`relative group ${themeClasses.card} backdrop-blur-xl rounded-[1.5rem] border ${themeClasses.border} ${accentClasses.hoverBorderClass} transition-all duration-300 overflow-hidden shadow-xl hover:shadow-2xl ${accentClasses.hoverShadowClass}`}
    >
      <div className={sizeClasses.padding}>
        {/* Top Section */}
        <div className={`relative flex items-start ${sizeClasses.spacing}`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`${sizeClasses.iconSize} rounded-xl bg-gradient-to-br ${accentClasses.lightClass} border border-white/5 flex items-center justify-center ${accentClasses.textClass} font-bold ${sizeClasses.iconText} shadow-inner shrink-0`}>
              {password.favicon && !faviconFailed ? (
                <img
                  src={password.favicon}
                  alt=""
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => setFaviconFailed(true)}
                />
              ) : (
                password.title.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`font-bold ${themeClasses.text} ${sizeClasses.titleSize} truncate`}>
                {password.title}
              </h3>
              <p className={`text-[0.6rem] font-bold uppercase tracking-widest ${themeClasses.textMuted} opacity-60 truncate`}>
                {password.website || "Saved password"}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={`absolute top-0 right-0 p-1.5 ${themeClasses.textMuted} hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Credentials Section */}
        <div className="mt-4 space-y-2">
          <div className={`group/item flex items-center justify-between min-w-0 ${sizeClasses.textSize}`}>
            <div className="min-w-0 flex-1">
              <span className={`${themeClasses.text} font-medium truncate block`}>{password.username}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy('username', onCopyUsername); }}
              className={`ml-2 p-1 rounded-md ${themeClasses.textMuted} ${accentClasses.hoverTextClass} hover:bg-white/5 transition-colors shrink-0`}
              title="Copy username"
            >
              {copiedField === 'username' ? (
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          <div className={`group/item flex items-center justify-between min-w-0 ${sizeClasses.textSize}`}>
            <div className="min-w-0 flex-1">
              <span className={`${themeClasses.textMuted} font-mono tracking-[0.3em] truncate block`}>••••••••</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy('password', onCopyPassword); }}
              className={`ml-2 p-1 rounded-md ${themeClasses.textMuted} ${accentClasses.hoverTextClass} hover:bg-white/5 transition-colors shrink-0`}
              title="Copy password"
            >
              {copiedField === 'password' ? (
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Custom Fields Toggle */}
        {password.customFields && password.customFields.length > 0 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCustom(!showCustom); }}
              className={`mt-3 w-full flex items-center justify-between px-3 py-1.5 rounded-lg ${themeClasses.item} ${themeClasses.textMuted} text-[0.55rem] font-bold uppercase tracking-widest transition-all`}
            >
              <span>{password.customFields.length} custom {password.customFields.length === 1 ? 'field' : 'fields'}</span>
              <svg className={`w-3 h-3 transition-transform ${showCustom ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCustom && (
              <div className={`mt-2 space-y-1.5 px-3 py-2 rounded-lg ${themeClasses.item}`}>
                {password.customFields.map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className={`text-[0.55rem] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>{f.name}</span>
                    <span className={`text-xs ${themeClasses.text} font-medium truncate ml-2 max-w-[60%]`}>{f.value}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
