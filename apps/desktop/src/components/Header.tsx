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
          bg: "bg-white/60",
          text: "text-slate-900",
          textMuted: "text-slate-500",
          border: "border-slate-200/60",
          button: "bg-slate-200/50 hover:bg-slate-200/80",
          input: "bg-slate-100/50",
        };
      case "slate":
        return {
          bg: "bg-slate-950/60",
          text: "text-slate-100",
          textMuted: "text-slate-400",
          border: "border-slate-800/60",
          button: "bg-slate-800/50 hover:bg-slate-800/80",
          input: "bg-slate-900/50",
        };
      case "editor":
        return {
          bg: "bg-[#0d0d0d]/60",
          text: "text-[#d4d4d4]",
          textMuted: "text-[#858585]",
          border: "border-[#333333]/60",
          button: "bg-[#252526]/50 hover:bg-[#252526]/80",
          input: "bg-[#1e1e1e]/50",
        };
      case "violet":
        return {
          bg: "bg-[#120a1f]/60",
          text: "text-[#f8f8f2]",
          textMuted: "text-[#c9a0dc]/70",
          border: "border-[#4a3a6b]/60",
          button: "bg-[#2d1b4d]/50 hover:bg-[#2d1b4d]/80",
          input: "bg-[#2d1b4d]/30",
        };
      default: // dark
        return {
          bg: "bg-black/60",
          text: "text-white",
          textMuted: "text-zinc-500",
          border: "border-zinc-800/60",
          button: "bg-zinc-900/50 hover:bg-zinc-900/80",
          input: "bg-zinc-900/30",
        };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor, theme);

  return (
    <header className={`${themeClasses.bg} backdrop-blur-xl border-b ${themeClasses.border} px-6 py-4 flex items-center justify-between gap-6 sticky top-0 z-30 transition-all duration-300`}>
      {/* Left: Brand & Stats */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col min-w-[140px]"
      >
        <div className="flex items-center gap-2.5">
          <h2 className={`text-lg font-bold tracking-tight ${themeClasses.text} truncate`}>
            {activeCategory === "all" ? "Secure Vault" : activeCategory}
          </h2>
          <span className={`px-2 py-0.5 rounded-md ${accentClasses.bgClass} bg-opacity-10 ${themeClasses.text} text-[0.6rem] font-bold ${accentClasses.textClass} bg-opacity-15`}>
            {passwordCount}
          </span>
        </div>
      </motion.div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-md relative group">
        <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${accentClasses.glowClass} opacity-0 group-focus-within:opacity-20 pointer-events-none`} />
        <svg
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textMuted} transition-colors group-focus-within:${accentClasses.textClass}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search your passwords..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 ${themeClasses.input} border border-transparent focus:${accentClasses.borderClass} rounded-xl text-xs font-medium ${themeClasses.text} placeholder-white/20 outline-none transition-all duration-200 ring-0 focus:ring-1 ${accentClasses.focusRingClass} shadow-sm`}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`p-2.5 rounded-xl ${themeClasses.button} ${themeClasses.text} transition-colors border border-transparent hover:border-white/5 relative group`}
          title="Sync Vault"
        >
          <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`group flex items-center gap-2 pl-3 pr-4 py-2.5 ${accentClasses.bgClass} ${accentClasses.onContrastClass} rounded-xl shadow-lg ${accentClasses.shadowClass} transition-all`}
        >
          <div className="bg-black/20 p-1 rounded-lg">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <span className="text-[0.65rem] font-bold uppercase tracking-wider">Link Account</span>
        </motion.button>
      </div>
    </header>
  );
}

