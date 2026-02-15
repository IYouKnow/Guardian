import { PasswordEntry, Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { motion } from "framer-motion";

interface PasswordTableProps {
  passwords: PasswordEntry[];
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  onDelete: (id: string) => void;
  theme: Theme;
  itemSize: "small" | "medium" | "large";
  accentColor: AccentColor;
}

export default function PasswordTable({
  passwords,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme,
  itemSize,
  accentColor,
}: PasswordTableProps) {
  const getSizeClasses = () => {
    if (itemSize === "small") {
      return {
        headerPadding: "py-3 px-4",
        cellPadding: "py-2 px-4",
        iconSize: "w-8 h-8",
        iconText: "text-xs",
        textSize: "text-xs",
        gap: "gap-3",
      };
    } else if (itemSize === "large") {
      return {
        headerPadding: "py-5 px-6",
        cellPadding: "py-5 px-6",
        iconSize: "w-12 h-12",
        iconText: "text-lg",
        textSize: "text-base",
        gap: "gap-5",
      };
    } else {
      return {
        headerPadding: "py-4 px-6",
        cellPadding: "py-3.5 px-6",
        iconSize: "w-10 h-10",
        iconText: "text-sm",
        textSize: "text-sm",
        gap: "gap-4",
      };
    }
  };

  const sizeClasses = getSizeClasses();

  const getThemeClasses = () => {
    switch (theme) {
      case "light":
        return {
          wrapper: "bg-white/50 backdrop-blur-xl border border-slate-200/60 shadow-xl shadow-slate-200/20",
          headerBg: "bg-slate-50/50",
          headerText: "text-slate-400",
          rowBorder: "border-slate-100",
          rowHover: "hover:bg-slate-50",
          text: "text-slate-700",
          textMuted: "text-slate-400",
          textTertiary: "text-slate-300",
          badge: "bg-slate-100 text-slate-600 border-slate-200",
        };
      case "slate":
        return {
          wrapper: "bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-xl shadow-black/20",
          headerBg: "bg-slate-900/30",
          headerText: "text-slate-500",
          rowBorder: "border-slate-800/50",
          rowHover: "hover:bg-slate-800/30",
          text: "text-slate-200",
          textMuted: "text-slate-500",
          textTertiary: "text-slate-600",
          badge: "bg-slate-800/50 text-slate-300 border-slate-700/50",
        };
      case "violet":
        return {
          wrapper: "bg-[#120a1f]/60 backdrop-blur-xl border border-[#4a3a6b]/30 shadow-xl shadow-black/20",
          headerBg: "bg-[#120a1f]/30",
          headerText: "text-[#6272a4]",
          rowBorder: "border-[#4a3a6b]/20",
          rowHover: "hover:bg-[#23173a]/40",
          text: "text-[#f8f8f2]",
          textMuted: "text-[#6272a4]",
          textTertiary: "text-[#4a3a6b]",
          badge: "bg-[#23173a]/50 text-[#c9a0dc] border-[#4a3a6b]/30",
        };
      default: // dark
        return {
          wrapper: "bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 shadow-xl shadow-black/40",
          headerBg: "bg-white/[0.02]",
          headerText: "text-zinc-500",
          rowBorder: "border-white/5",
          rowHover: "hover:bg-white/[0.03]",
          text: "text-zinc-200",
          textMuted: "text-zinc-500",
          textTertiary: "text-zinc-700",
          badge: "bg-white/5 text-zinc-400 border-white/5",
        };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor, theme);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full overflow-hidden rounded-2xl ${themeClasses.wrapper}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b ${themeClasses.rowBorder} ${themeClasses.headerBg}`}>
              <th className={`${sizeClasses.headerPadding} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest`}>Service</th>
              <th className={`${sizeClasses.headerPadding} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest`}>Username</th>
              <th className={`${sizeClasses.headerPadding} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest`}>Website</th>
              <th className={`${sizeClasses.headerPadding} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest`}>Password</th>
              <th className={`${sizeClasses.headerPadding} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest`}>Category</th>
              <th className={`${sizeClasses.headerPadding} ${themeClasses.headerText} text-[0.65rem] font-bold uppercase tracking-widest text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {passwords.map((password, index) => (
              <motion.tr
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={password.id}
                className={`group border-b last:border-0 ${themeClasses.rowBorder} ${themeClasses.rowHover} transition-all duration-200`}
              >
                {/* Service */}
                <td className={sizeClasses.cellPadding}>
                  <div className={`flex items-center ${sizeClasses.gap}`}>
                    <div className={`${sizeClasses.iconSize} rounded-xl ${accentClasses.bgClass} flex items-center justify-center shadow-lg ${accentClasses.shadowClass} transition-transform group-hover:scale-110 duration-300`}>
                      <span className={`font-bold ${accentClasses.onContrastClass} ${sizeClasses.iconText}`}>
                        {password.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className={`font-semibold ${themeClasses.text} ${sizeClasses.textSize} leading-tight`}>{password.title}</div>
                      {password.favorite && (
                        <div className={`text-[0.6rem] font-bold uppercase tracking-wider ${accentClasses.textClass} mt-0.5`}>Favorite</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Username */}
                <td className={sizeClasses.cellPadding}>
                  <div className={`flex items-center gap-2 group/field cursor-pointer`} onClick={() => onCopyUsername(password.username)}>
                    <span className={`${themeClasses.textMuted} ${sizeClasses.textSize} group-hover/field:${themeClasses.text} transition-colors`}>
                      {password.username}
                    </span>
                    <svg className={`w-3 h-3 ${themeClasses.textMuted} opacity-0 group-hover/field:opacity-100 transition-all`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </td>

                {/* Website */}
                <td className={sizeClasses.cellPadding}>
                  <span className={`${themeClasses.textMuted} ${sizeClasses.textSize} opacity-70`}>{password.website}</span>
                </td>

                {/* Password */}
                <td className={sizeClasses.cellPadding}>
                  <div className={`flex items-center gap-2 group/field cursor-pointer`} onClick={() => onCopyPassword(password.password)}>
                    <span className={`${themeClasses.textTertiary} text-lg tracking-widest leading-none mt-1.5 group-hover/field:${themeClasses.text} transition-colors`}>
                      ••••••••
                    </span>
                    <svg className={`w-3 h-3 ${themeClasses.textMuted} opacity-0 group-hover/field:opacity-100 transition-all`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </td>

                {/* Category */}
                <td className={sizeClasses.cellPadding}>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[0.65rem] font-bold uppercase tracking-wider ${themeClasses.badge}`}>
                    {password.category}
                  </span>
                </td>

                {/* Actions */}
                <td className={sizeClasses.cellPadding}>
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(password.id);
                      }}
                      className={`p-2 rounded-lg hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors`}
                      title="Delete Entry"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

