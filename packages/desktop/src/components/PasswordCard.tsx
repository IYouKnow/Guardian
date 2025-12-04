import { PasswordEntry } from "../types";

interface PasswordCardProps {
  password: PasswordEntry;
  isSelected: boolean;
  showPassword: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onTogglePasswordVisibility: () => void;
}

export default function PasswordCard({
  password,
  isSelected,
  showPassword,
  onSelect,
  onToggleFavorite,
  onTogglePasswordVisibility,
}: PasswordCardProps) {
  const getStrengthColor = (strength?: string) => {
    switch (strength) {
      case "very-strong": return "bg-green-500";
      case "strong": return "bg-green-400";
      case "medium": return "bg-yellow-400";
      case "weak": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-gradient-to-br from-[#0a0a0a] to-[#111111] rounded-xl border transition-all cursor-pointer aspect-square flex flex-col overflow-hidden group ${
        isSelected
          ? "border-yellow-400/50 shadow-lg shadow-yellow-400/10"
          : "border-[#1a1a1a] hover:border-yellow-400/30 hover:shadow-lg"
      }`}
    >
      {/* Header with icon and favorite */}
      <div className="relative p-4 pb-2">
        <div className="flex items-start justify-between mb-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400/30 to-yellow-500/20 border-2 border-yellow-400/30 flex items-center justify-center text-yellow-400 font-bold text-xl shadow-lg">
              {password.title.charAt(0).toUpperCase()}
            </div>
            {password.breached && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
              password.favorite
                ? "text-yellow-400 bg-yellow-400/10"
                : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
            }`}
            title="Toggle favorite"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        </div>

        {/* Title and username */}
        <div className="mb-2">
          <h3 className="font-bold text-white text-sm mb-0.5 truncate">{password.title}</h3>
          <p className="text-xs text-gray-400 truncate">{password.username}</p>
        </div>

        {/* Password strength indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className={`h-full ${getStrengthColor(password.passwordStrength)} transition-all`}
              style={{
                width:
                  password.passwordStrength === "very-strong"
                    ? "100%"
                    : password.passwordStrength === "strong"
                    ? "75%"
                    : password.passwordStrength === "medium"
                    ? "50%"
                    : "25%",
              }}
            />
          </div>
          <span className="text-[10px] text-gray-500 uppercase font-medium">
            {password.passwordStrength?.replace("-", " ") || "unknown"}
          </span>
        </div>

        {/* Tags */}
        {password.tags && password.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {password.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 bg-[#1a1a1a] text-[10px] text-gray-400 rounded border border-[#1a1a1a]"
              >
                {tag}
              </span>
            ))}
            {password.tags.length > 2 && (
              <span className="px-1.5 py-0.5 text-[10px] text-gray-500">+{password.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isSelected && (
        <div className="px-4 pb-4 mt-auto border-t border-[#1a1a1a] pt-3 space-y-2 bg-[#0a0a0a]/50">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
            <span>Modified: {password.lastModified || "Unknown"}</span>
            {password.category && (
              <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-400 rounded border border-yellow-400/20">
                {password.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <input
              type={showPassword ? "text" : "password"}
              value={showPassword ? "MySecurePassword123!" : "••••••••"}
              readOnly
              className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-white font-mono text-xs"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePasswordVisibility();
              }}
              className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-[#1a1a1a] rounded-lg transition-all"
            >
              {showPassword ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {password.notes && (
            <p className="text-[10px] text-gray-500 italic mb-2 line-clamp-2">{password.notes}</p>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Copy logic
              }}
              className="flex-1 px-2 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              Copy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Edit logic
              }}
              className="px-2 py-1.5 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-xs font-medium transition-all"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Open website
              }}
              className="px-2 py-1.5 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-xs transition-all"
              title="Open website"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Quick actions when not expanded */}
      {!isSelected && (
        <div className="px-4 pb-3 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>{password.lastModified || "Unknown"}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Quick copy
                }}
                className="p-1 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                title="Quick copy"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Open website
                }}
                className="p-1 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                title="Open website"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

