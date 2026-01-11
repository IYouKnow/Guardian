import { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { motion } from "framer-motion";

interface HeaderProps {
  activeCategory: string;
  passwordCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function Header({
  activeCategory,
  passwordCount,
  searchQuery,
  onSearchChange,
  theme,
  accentColor,
}: HeaderProps) {
  const getThemeClasses = () => {
    switch (theme) {
      case "light":
        return {
          bg: "bg-white/40",
          text: "text-slate-900",
          textMuted: "text-slate-500",
          border: "border-slate-200",
          button: "bg-slate-200/50 hover:bg-slate-200/80",
        };
      case "slate":
        return {
          bg: "bg-slate-950/40",
          text: "text-slate-100",
          textMuted: "text-slate-400",
          border: "border-slate-800",
          button: "bg-slate-800/50 hover:bg-slate-800/80",
        };
      case "editor":
        return {
          bg: "bg-[#0d0d0d]/40",
          text: "text-[#d4d4d4]",
          textMuted: "text-[#858585]",
          border: "border-[#333333]",
          button: "bg-[#252526]/50 hover:bg-[#252526]/80",
        };
      case "violet":
        return {
          bg: "bg-[#120a1f]/40",
          text: "text-[#f8f8f2]",
          textMuted: "text-[#c9a0dc]/70",
          border: "border-[#4a3a6b]",
          button: "bg-[#2d1b4d]/50 hover:bg-[#2d1b4d]/80",
        };
      default: // dark
        return {
          bg: "bg-black/40",
          text: "text-white",
          textMuted: "text-zinc-500",
          border: "border-zinc-800/50",
          button: "bg-zinc-900/50 hover:bg-zinc-900/80",
        };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor, theme);

  return (
    <header className={`${themeClasses.bg} backdrop-blur-xl border-b ${themeClasses.border} p-6 overflow-x-hidden relative z-20`}>
      <div className="flex items-center justify-between mb-8">
        <motion.div
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="min-w-0 flex-1"
        >
          <h2 className={`text-2xl font-bold tracking-tight ${themeClasses.text} mb-1 truncate`}>
            {activeCategory === "all" ? "Secure Vault" : activeCategory}
          </h2>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${accentClasses.bgClass}`} />
            <p className={`text-[0.65rem] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
              {passwordCount} Total Records
            </p>
          </div>
        </motion.div>

        <div className="flex items-center gap-2.5">
          <button className={`px-4 py-2 ${themeClasses.button} ${themeClasses.text} rounded-xl text-[0.65rem] font-bold uppercase tracking-wider transition-all border ${themeClasses.border}`}>
            Link Account
          </button>
          <button className={`px-4 py-2 ${accentClasses.bgClass} ${accentClasses.onContrastClass} rounded-xl text-[0.65rem] font-bold uppercase tracking-wider transition-all shadow-lg ${accentClasses.shadowClass}`}>
            Sync
          </button>
        </div>
      </div>

      <div className="relative group">
        <svg
          className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textMuted} transition-colors group-focus-within:${accentClasses.textClass}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Filter your vault..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-11 pr-4 py-3.5 ${themeClasses.button} border ${themeClasses.border} rounded-2xl ${themeClasses.text} placeholder-white/10 outline-none transition-all duration-200 ring-0 focus:ring-4 ${accentClasses.focusRingClass} focus:${accentClasses.borderClass}`}
        />
      </div>
    </header>
  );
}

