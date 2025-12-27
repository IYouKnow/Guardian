import type { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface SettingsProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
  onBack: () => void;
  onLogout: () => void;
}

export default function Settings({ theme, onThemeChange, accentColor, onAccentColorChange, onBack, onLogout }: SettingsProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-[#fafafa]",
        text: "text-gray-800",
        sectionBg: "bg-white/80",
        divider: "border-gray-200",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-400",
        hoverBg: "hover:bg-gray-100/50",
        activeBg: "bg-gray-100",
        activeText: "text-gray-900",
        border: "border-gray-200",
        cardBg: "bg-white",
      };
    } else if (theme === "slate") {
      return {
        bg: "bg-[#0f172a]",
        text: "text-slate-100",
        sectionBg: "bg-[#1e293b]/50",
        divider: "border-slate-800",
        textSecondary: "text-slate-400",
        textTertiary: "text-slate-500",
        hoverBg: "hover:bg-slate-800/50",
        activeBg: "bg-slate-800/80",
        activeText: "text-slate-100",
        border: "border-slate-800",
        cardBg: "bg-slate-800/40",
      };
    } else if (theme === "editor") {
      return {
        bg: "bg-[#1e1e1e]",
        text: "text-[#d4d4d4]",
        sectionBg: "bg-[#252526]/50",
        divider: "border-[#3e3e42]",
        textSecondary: "text-gray-300",
        textTertiary: "text-gray-400",
        hoverBg: "hover:bg-[#2a2d2e]/70",
        activeBg: "bg-[#2a2d2e]/80",
        activeText: "text-[#d4d4d4]",
        border: "border-[#333333]",
        cardBg: "bg-[#252526]/40",
      };
    } else if (theme === "violet") {
      return {
        bg: "bg-[#1a1b26]",
        text: "text-[#a9b1d6]",
        sectionBg: "bg-[#24283b]/50",
        divider: "border-[#414868]/40",
        textSecondary: "text-gray-300",
        textTertiary: "text-gray-400",
        hoverBg: "hover:bg-[#414868]/30",
        activeBg: "bg-[#414868]/50",
        activeText: "text-[#c0caf5]",
        border: "border-[#414868]/30",
        cardBg: "bg-[#24283b]/40",
      };
    } else {
      return {
        bg: "bg-[#050505]",
        text: "text-white",
        sectionBg: "bg-[#111111]/50",
        divider: "border-white/10",
        textSecondary: "text-gray-300",
        textTertiary: "text-gray-500",
        hoverBg: "hover:bg-white/10",
        activeBg: "bg-white/20",
        activeText: "text-white",
        border: "border-white/10",
        cardBg: "bg-[#111111]/40",
      };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  const themeList: Theme[] = ["light", "dark", "slate", "editor", "violet"];

  const accents: { id: AccentColor; color: string }[] = [
    { id: "yellow", color: "bg-yellow-400" },
    { id: "blue", color: "bg-blue-500" },
    { id: "green", color: "bg-emerald-500" },
    { id: "purple", color: "bg-purple-500" },
    { id: "pink", color: "bg-pink-500" },
  ];

  return (
    <div className={`flex flex-col h-full overflow-hidden ${themeClasses.bg} ${themeClasses.text} font-sans`}>
      {/* Header */}
      <header className={`px-6 py-5 flex items-center justify-between shrink-0 border-b ${themeClasses.border}`}>
        <div>
          <h1 className="text-base font-bold">Settings</h1>
          <p className={`text-[10px] ${themeClasses.textTertiary}`}>Customize your experience</p>
        </div>
        <button
          onClick={onBack}
          className={`p-2 rounded-lg transition-all duration-300 ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${themeClasses.activeText}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
        {/* Appearance */}
        <section className="space-y-6">
          <div className="space-y-4">
            <label className={`block text-[10px] font-black uppercase tracking-[0.2em] ${themeClasses.textTertiary}`}>Theme Engine</label>
            <div className="grid grid-cols-3 gap-3">
              {themeList.map((t) => (
                <button
                  key={t}
                  onClick={() => onThemeChange(t)}
                  className="group flex flex-col items-center gap-2"
                >
                  <div className={`
                    w-full aspect-[16/10] rounded-xl border-2 transition-all duration-300 overflow-hidden relative
                    ${theme === t ? `border-transparent ring-2 ${accentClasses.focusRingClass} shadow-lg scale-[1.02]` : `${themeClasses.border} opacity-50 grayscale hover:grayscale-0 hover:opacity-100`}
                  `}>
                    <div className={`absolute inset-0 p-2 flex flex-col gap-1.5 ${t === 'light' ? 'bg-[#fafafa]' :
                      t === 'slate' ? 'bg-[#0f172a]' :
                        t === 'editor' ? 'bg-[#1e1e1e]' :
                          t === 'violet' ? 'bg-[#1a1b26]' : 'bg-[#050505]'
                      }`}>
                      <div className={`h-1.5 w-3/4 rounded-full ${t === 'light' ? 'bg-gray-200' : 'bg-white/10'}`} />
                      <div className="flex-1 grid grid-cols-2 gap-1.5">
                        <div className={`rounded-md ${t === 'light' ? 'bg-gray-100' : 'bg-white/5'}`} />
                        <div className={`rounded-md ${t === 'light' ? 'bg-gray-100' : 'bg-white/5'}`} />
                      </div>
                      <div className={`h-3 w-full rounded-md ${theme === t ? 'opacity-100' : 'opacity-20'} ${accentClasses.bgClass} transition-opacity duration-300`} />
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${theme === t ? accentClasses.textClass : themeClasses.textSecondary}`}>
                    {t}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className={`block text-[10px] font-black uppercase tracking-[0.2em] ${themeClasses.textTertiary}`}>Accent Interface</label>
            <div className="flex flex-wrap gap-4">
              {accents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onAccentColorChange(a.id)}
                  className={`w-7 h-7 rounded-full transition-all duration-500 flex items-center justify-center p-0.5 ${accentColor === a.id ? `ring-2 ${accentClasses.bgClass} ring-offset-2 ring-offset-transparent scale-110` : 'hover:scale-110'
                    }`}
                >
                  <div className={`w-full h-full rounded-full ${a.color} shadow-sm`} />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Action Section */}
        <section className="space-y-4 pt-6 mt-4 border-t border-white/5">
          <button
            onClick={onLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 border border-red-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout session
          </button>
        </section>
      </div>
    </div>
  );
}
