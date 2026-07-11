import { useState, useEffect, useRef, useMemo } from "react";
import { Theme } from "../types";
import type { PasswordEntry } from "../types";
import { getThemeClasses } from "../utils/accentColors";
import { motion, AnimatePresence } from "framer-motion";

interface SearchOverlayProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  passwords: PasswordEntry[];
  onCopyUsername: (username: string) => void;
  onCopyPassword: (password: string) => void;
  theme: Theme;
}

export default function SearchOverlay({
  isOpen,
  query,
  onQueryChange,
  onClose,
  passwords,
  onCopyUsername,
  onCopyPassword,
  theme,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const themeClasses = getThemeClasses(theme);
  const [copiedId, setCopiedId] = useState<{ entryId: string; target: "username" | "password" } | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return passwords.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.username && p.username.toLowerCase().includes(q)) ||
        (p.website && p.website.toLowerCase().includes(q))
    );
  }, [query, passwords]);

  useEffect(() => {
    if (isOpen) {
      setCopiedId(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = (entryId: string, target: "username" | "password", value: string) => {
    if (target === "username") onCopyUsername(value);
    else onCopyPassword(value);
    setCopiedId({ entryId, target });
    setTimeout(() => setCopiedId(null), 1200);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-start justify-center pt-[12vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-2xl ${themeClasses.bg} ${themeClasses.border}`}
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <svg className={`w-4 h-4 flex-shrink-0 ${themeClasses.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search all passwords..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className={`flex-1 bg-transparent outline-none text-sm font-medium ${themeClasses.text} placeholder-white/20`}
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className={`p-1 rounded-md opacity-40 hover:opacity-80 transition-opacity ${themeClasses.textMuted}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {query && (
          <div className="max-h-80 overflow-y-auto custom-scrollbar pb-6">
            {results.length === 0 ? (
              <div className={`px-4 py-6 text-center text-xs font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
                No matches found
              </div>
            ) : (
              <AnimatePresence>
                {results.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors cursor-pointer group`}
                    onClick={() => handleCopy(entry.id, "password", entry.password)}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/60 flex-shrink-0`}>
                      {entry.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${themeClasses.text}`}>{entry.title}</div>
                      <div className={`text-[0.6rem] font-medium truncate ${themeClasses.textMuted}`}>{entry.username || "—"}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
                      {entry.username && (
                        <div className="relative group/tooltip">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopy(entry.id, "username", entry.username); }}
                            className={`p-1.5 rounded-lg transition-all ${
                              copiedId?.entryId === entry.id && copiedId?.target === "username"
                                ? "text-green-400 bg-green-500/10"
                                : `${themeClasses.textMuted} hover:text-white hover:bg-white/10`
                            }`}
                          >
                            {copiedId?.entryId === entry.id && copiedId?.target === "username" ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            )}
                          </button>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-[0.5rem] font-bold uppercase tracking-wider text-zinc-300 whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 delay-500 pointer-events-none">
                            {copiedId?.entryId === entry.id && copiedId?.target === "username" ? "Copied!" : "Copy Username"}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-zinc-700" />
                          </div>
                        </div>
                      )}
                      <div className="relative group/tooltip">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(entry.id, "password", entry.password); }}
                          className={`p-1.5 rounded-lg transition-all ${
                            copiedId?.entryId === entry.id && copiedId?.target === "password"
                              ? "text-green-400 bg-green-500/10"
                              : `${themeClasses.textMuted} hover:text-white hover:bg-white/10`
                          }`}
                        >
                          {copiedId?.entryId === entry.id && copiedId?.target === "password" ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          )}
                        </button>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-[0.5rem] font-bold uppercase tracking-wider text-zinc-300 whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 delay-500 pointer-events-none">
                          {copiedId?.entryId === entry.id && copiedId?.target === "password" ? "Copied!" : "Copy Password"}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-zinc-700" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        <div className={`px-4 py-2.5 flex items-center justify-between ${themeClasses.textMuted}`}>
          <span className="text-[0.6rem] font-bold uppercase tracking-widest">
            {query ? `${results.length} of ${passwords.length} entries` : `${passwords.length} entries`}
          </span>
          <span className="text-[0.6rem] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <kbd className={`px-1.5 py-0.5 rounded text-[0.55rem] font-bold ${themeClasses.item} border ${themeClasses.border}`}>esc</kbd>
            to close
          </span>
        </div>
      </motion.div>
    </div>
  );
}
