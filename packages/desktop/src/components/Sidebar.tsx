import { Theme, AccentColor } from "../types";
import { getAccentColorClasses, getThemeClasses } from "../utils/accentColors";
import { motion } from "framer-motion";

interface SidebarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  onAddPassword: () => void;
  onLogout: () => void;
  onSettings: () => void;
  showSettings: boolean;
  theme: Theme;
  accentColor: AccentColor;
}

export default function Sidebar({
  categories,
  activeCategory,
  onCategoryChange,
  onAddPassword,
  onLogout,
  onSettings,
  showSettings,
  theme,
  accentColor,
}: SidebarProps) {
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);

  return (
    <aside className={`w-full h-full backdrop-blur-xl ${themeClasses.bg} border-r ${themeClasses.border} flex flex-col relative`}>
      {/* Branding */}
      <div className={`p-8 border-b ${themeClasses.border}`}>
        <div className="flex items-center justify-between mb-1">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className={`w-8 h-8 rounded-lg ${accentClasses.bgClass} flex items-center justify-center shadow-lg ${accentClasses.shadowClass}`}>
              <svg className={`w-5 h-5 ${accentClasses.onContrastClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className={`text-xl font-bold tracking-tight ${themeClasses.text}`}>Guardian</h1>
          </motion.div>
          <button
            onClick={onLogout}
            className={`p-2 ${themeClasses.textMuted} hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all`}
            title="Lock Vault"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-6">
        <div>
          <h3 className={`text-[0.65rem] font-bold ${themeClasses.textMuted} uppercase tracking-[0.2em] mb-4 px-3`}>
            Categories
          </h3>
          <ul className="space-y-1.5">
            {categories.map((category) => (
              <li key={category}>
                <button
                  onClick={() => onCategoryChange(category)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between group ${activeCategory === category && !showSettings
                    ? `${accentClasses.bgClass} ${accentClasses.onContrastClass} shadow-lg ${accentClasses.shadowClass}`
                    : `${themeClasses.textMuted} ${themeClasses.item} hover:${themeClasses.text}`
                    }`}
                >
                  <span>{category === "all" ? "Whole Vault" : category}</span>
                  {activeCategory === category && !showSettings && (
                    <motion.div layoutId="active-indicator" className={`w-1.5 h-1.5 rounded-full ${accentClasses.onContrast === 'white' ? 'bg-white/40' : 'bg-black/40'}`} />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={`pt-6 border-t ${themeClasses.border}`}>
          <h3 className={`text-[0.65rem] font-bold ${themeClasses.textMuted} uppercase tracking-[0.2em] mb-4 px-3`}>
            System
          </h3>
          <ul className="space-y-1.5">
            <li>
              <button
                onClick={onSettings}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 ${showSettings
                  ? `${accentClasses.bgClass} ${accentClasses.onContrastClass} shadow-lg ${accentClasses.shadowClass}`
                  : `${themeClasses.textMuted} ${themeClasses.item} hover:${themeClasses.text}`
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Preferences
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Footer Action */}
      <div className={`p-6 border-t ${themeClasses.border}`}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onAddPassword}
          className={`w-full ${accentClasses.bgClass} ${accentClasses.onContrastClass} font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg ${accentClasses.shadowClass} flex items-center justify-center gap-2.5 text-[0.65rem] uppercase tracking-wider`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Record
        </motion.button>
      </div>
    </aside>
  );
}

