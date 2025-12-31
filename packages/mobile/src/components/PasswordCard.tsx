import type { PasswordEntry } from "../types";

interface PasswordCardProps {
  password: PasswordEntry;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onDelete: () => void;
  theme?: "dark" | "half-dark" | "light";
}

export default function PasswordCard({
  password,
  onCopyUsername,
  onCopyPassword,
  onDelete,
  theme = "dark",
}: PasswordCardProps) {
  const getCardClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-gradient-to-br from-gray-50 to-gray-100",
        border: "border-gray-200",
        text: "text-gray-900",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-500",
      };
    } else if (theme === "half-dark") {
      return {
        bg: "bg-gradient-to-br from-gray-800 to-gray-900",
        border: "border-gray-700",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
      };
    } else {
      return {
        bg: "bg-gradient-to-br from-[#0a0a0a] to-[#111111]",
        border: "border-[#1a1a1a]",
        text: "text-white",
        textSecondary: "text-gray-400",
        textTertiary: "text-gray-500",
      };
    }
  };

  const cardClasses = getCardClasses();

  return (
    <div className={`${cardClasses.bg} rounded-lg border ${cardClasses.border} hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-400/10 transition-all group relative active:scale-95`}>
      <div className="p-3">
        {/* Header with icon and title */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400/30 to-yellow-500/20 border border-yellow-400/30 flex items-center justify-center text-yellow-400 font-bold text-sm shadow-lg">
              {password.title.charAt(0).toUpperCase()}
            </div>
            {password.breached && (
              <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center border ${
                theme === "light" ? "border-gray-50" : theme === "half-dark" ? "border-gray-800" : "border-[#0a0a0a]"
              }`}>
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <h3 className={`font-semibold ${cardClasses.text} text-sm truncate flex-1`}>{password.title}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
            title="Delete password"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Username with copy icon */}
        <div className="mb-2">
          <div className="flex items-center gap-1.5">
            <p className={`text-xs ${cardClasses.textSecondary} truncate flex-1`}>{password.username || "No username"}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyUsername();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
              title="Copy username"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Password with copy icon */}
        <div className="flex items-center gap-1.5">
          <p className={`text-xs ${cardClasses.textTertiary} font-mono flex-1`}>••••••••</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyPassword();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
            title="Copy password"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
