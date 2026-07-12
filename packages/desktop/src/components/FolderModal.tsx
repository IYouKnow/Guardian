import { useState, useEffect, useRef } from "react";
import { Theme, AccentColor } from "../types";
import { getThemeClasses, getAccentColorClasses } from "../utils/accentColors";
import { normalizeIcon } from "@guardian/shared";

interface FolderModalProps {
  parentId: string | null;
  onClose: () => void;
  onCreate: (name: string, icon?: string) => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function FolderModal({ parentId, onClose, onCreate, theme, accentColor }: FolderModalProps) {
  const [name, setName] = useState("");
  const [iconDataUrl, setIconDataUrl] = useState<string | undefined>(undefined);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);

  useEffect(() => {
    setName("");
    setIconDataUrl(undefined);
    setError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [parentId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleIconPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError("");
    setIsNormalizing(true);
    try {
      const normalized = await normalizeIcon(file);
      if (!normalized) throw new Error("Couldn't prepare that icon.");
      setIconDataUrl(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare icon.");
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), iconDataUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className={`bg-[#1a1a1a] border ${themeClasses.border} rounded-xl shadow-2xl p-5 w-80`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`text-sm font-bold ${themeClasses.text} mb-4`}>
          {parentId === null ? "New Folder" : "New Subfolder"}
        </h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleIconPick}
          className="hidden"
        />
        {error && (
          <div className="p-2 mb-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <label className={`text-[0.65rem] font-bold ${themeClasses.textMuted} uppercase tracking-wider`}>
            Icon
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isNormalizing}
              className={`px-3 py-1.5 ${themeClasses.input} hover:bg-white/5 border ${themeClasses.border} rounded-lg text-xs transition-all disabled:opacity-50`}
            >
              {iconDataUrl ? "Replace" : "Add icon"}
            </button>
            {iconDataUrl && (
              <button
                type="button"
                onClick={() => setIconDataUrl(undefined)}
                className="px-3 py-1.5 border border-[#2a2a2a] text-gray-300 rounded-lg text-xs transition-all"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <div className={`w-full ${themeClasses.input} border ${themeClasses.border} rounded-lg px-4 py-3 mb-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#2a2a2a] border border-[#333] flex items-center justify-center text-sm font-bold text-gray-400 flex-shrink-0">
              {iconDataUrl ? (
                <img src={iconDataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{name.trim() || "Folder name"}</p>
              <p className="text-xs text-gray-500 truncate">
                {isNormalizing ? "Preparing icon..." : iconDataUrl ? "Custom icon" : "Default folder"}
              </p>
            </div>
          </div>
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="Folder name"
          className={`w-full ${themeClasses.input} border ${themeClasses.border} rounded-lg px-3 py-2 text-sm ${themeClasses.text} placeholder-white/20 outline-none focus:ring-2 ${accentClasses.focusRingClass} focus:${accentClasses.borderClass} mb-4`}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs ${themeClasses.textMuted} hover:${themeClasses.text} transition-colors`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className={`px-4 py-2 text-xs font-bold ${accentClasses.bgClass} ${accentClasses.onContrastClass} rounded-lg hover:opacity-90 transition-all disabled:opacity-50`}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
