import { useState, useEffect, useRef } from "react";
import { Theme, AccentColor } from "../types";
import { getThemeClasses, getAccentColorClasses } from "../utils/accentColors";

interface FolderModalProps {
  parentId: string | null;
  onClose: () => void;
  onCreate: (name: string) => void;
  theme: Theme;
  accentColor: AccentColor;
}

export default function FolderModal({ parentId, onClose, onCreate, theme, accentColor }: FolderModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);

  useEffect(() => {
    setName("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [parentId]);

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-[#1a1a1a] border ${themeClasses.border} rounded-xl shadow-2xl p-5 w-80`}>
        <h3 className={`text-sm font-bold ${themeClasses.text} mb-4`}>
          {parentId === null ? "New Folder" : "New Subfolder"}
        </h3>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") onClose();
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
