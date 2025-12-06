import { PasswordEntry } from "../types";

interface PasswordTableProps {
  passwords: PasswordEntry[];
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  onDelete: (id: string) => void;
  theme: "dark" | "half-dark" | "light";
}

export default function PasswordTable({
  passwords,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme,
}: PasswordTableProps) {
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        border: "border-gray-200",
        hoverBg: "hover:bg-gray-50",
        text: "text-gray-900",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-500",
        headerText: "text-gray-500",
        badgeBg: "bg-gray-100",
        badgeText: "text-gray-600",
        iconBorder: "border-yellow-400/20",
      };
    } else if (theme === "half-dark") {
      return {
        border: "border-gray-700",
        hoverBg: "hover:bg-gray-800",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        headerText: "text-gray-500",
        badgeBg: "bg-gray-700",
        badgeText: "text-gray-300",
        iconBorder: "border-yellow-400/20",
      };
    } else {
      return {
        border: "border-[#1a1a1a]",
        hoverBg: "hover:bg-[#0a0a0a]",
        text: "text-white",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
        headerText: "text-gray-500",
        badgeBg: "bg-[#1a1a1a]",
        badgeText: "text-gray-400",
        iconBorder: "border-yellow-400/20",
      };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className={`border-b ${themeClasses.border}`}>
            <th className={`text-left py-3 px-4 text-xs font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Service</th>
            <th className={`text-left py-3 px-4 text-xs font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Username</th>
            <th className={`text-left py-3 px-4 text-xs font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Website</th>
            <th className={`text-left py-3 px-4 text-xs font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Password</th>
            <th className={`text-left py-3 px-4 text-xs font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Category</th>
            <th className={`text-left py-3 px-4 text-xs font-semibold ${themeClasses.headerText} uppercase tracking-wider`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {passwords.map((password) => (
            <tr
              key={password.id}
              className={`border-b ${themeClasses.border} ${themeClasses.hoverBg} transition-colors group`}
            >
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border ${themeClasses.iconBorder} flex items-center justify-center text-yellow-400 font-bold`}>
                    {password.title.charAt(0).toUpperCase()}
                  </div>
                  <span className={`font-medium ${themeClasses.text}`}>{password.title}</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 group/username">
                  <span className={`${themeClasses.textSecondary} text-sm`}>{password.username}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyUsername(password.username);
                    }}
                    className="opacity-0 group-hover/username:opacity-100 p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                    title="Copy username"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </td>
              <td className={`py-4 px-4 ${themeClasses.textSecondary} text-sm`}>{password.website}</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 group/password">
                  <span className={`${themeClasses.textTertiary} font-mono text-sm`}>••••••••</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyPassword(password.password);
                    }}
                    className="opacity-0 group-hover/password:opacity-100 p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                    title="Copy password"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </td>
              <td className="py-4 px-4">
                <span className={`px-2 py-1 ${themeClasses.badgeBg} ${themeClasses.badgeText} text-xs rounded`}>{password.category}</span>
              </td>
              <td className="py-4 px-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(password.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                  title="Delete password"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

