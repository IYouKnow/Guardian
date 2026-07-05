import { useState, useRef, useEffect } from "react";
import { Theme, AccentColor, Folder } from "../types";
import { getAccentColorClasses, getThemeClasses } from "../utils/accentColors";
import { motion } from "framer-motion";

interface SidebarProps {
  folders: Folder[];
  activeFolderId: string | null;
  onFolderChange: (id: string | null) => void;
  onAddFolder: (parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onAddPassword: () => void;
  onLogout: () => void;
  onSettings: () => void;
  showSettings: boolean;
  theme: Theme;
  accentColor: AccentColor;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  connectionMode: "local" | "server";
  vaultName: string;
  username?: string | null;
  dragTargetFolderId?: string | null;
}

function getChildFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parentId === parentId);
}

export default function Sidebar({
  folders,
  activeFolderId,
  onFolderChange,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onAddPassword,
  onLogout,
  onSettings,
  showSettings,
  theme,
  accentColor,
  searchQuery,
  onSearchChange,
  connectionMode,
  vaultName,
  username,
  dragTargetFolderId,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: string | null } | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const contextRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const sidebarRef = useRef<HTMLElement>(null);
  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);

  useEffect(() => {
    if (renamingFolderId) {
      const folder = folders.find((f) => f.id === renamingFolderId);
      if (folder) setRenameValue(folder.name);
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [renamingFolderId, folders]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect();
      setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, folderId });
    }
  };

  const handleRenameSubmit = () => {
    if (renamingFolderId && renameValue.trim()) {
      onRenameFolder(renamingFolderId, renameValue.trim());
    }
    setRenamingFolderId(null);
  };

  const renderFolderItem = (folder: Folder, depth: number) => {
    const children = getChildFolders(folders, folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = activeFolderId === folder.id;
    const isRenaming = renamingFolderId === folder.id;

    return (
      <li key={folder.id}>
        <div
          data-folder-id={folder.id}
          className={`group relative flex items-center gap-1 w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            isActive && !showSettings
              ? `${accentClasses.bgClass} ${accentClasses.onContrastClass} shadow-lg ${accentClasses.shadowClass}`
              : dragTargetFolderId === folder.id
                ? `${accentClasses.borderClass} ${accentClasses.lightClass}`
                : `${themeClasses.textMuted} ${themeClasses.item} hover:${themeClasses.text}`
          } ${dragTargetFolderId === folder.id ? `ring-2 ${accentClasses.focusRingClass}` : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => onFolderChange(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder.id)}
        >
          {children.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(folder.id); }}
              className={`w-4 h-4 flex items-center justify-center flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-4 h-4 flex-shrink-0" />
          )}
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") setRenamingFolderId(null); }}
              className={`flex-1 min-w-0 bg-transparent outline-none border-b ${accentClasses.borderClass} text-xs font-bold uppercase tracking-wider`}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">{folder.name}</span>
          )}
          {isActive && !showSettings && (
            <motion.div layoutId="active-indicator" className={`w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0 ${accentClasses.onContrast === 'white' ? 'bg-white/40' : 'bg-black/40'}`} />
          )}
        </div>
        {children.length > 0 && isExpanded && (
          <ul className="space-y-0.5">
            {children.map((child) => renderFolderItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const rootFolders = getChildFolders(folders, null);

  return (
    <aside ref={sidebarRef} className={`w-full h-full backdrop-blur-xl ${themeClasses.bg} border-r ${themeClasses.border} flex flex-col relative overflow-visible`}>
      {/* Branding */}
      <div className={`p-6 pb-4 border-b ${themeClasses.border}`}>
        <div className="flex items-center justify-between mb-3">
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
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-6">
        {/* Search */}
        <div className="px-1">
          <div className="relative group">
            <svg
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeClasses.textMuted} transition-colors group-focus-within:${accentClasses.textClass}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 ${themeClasses.input} rounded-xl text-xs font-medium ${themeClasses.text} placeholder-white/20 outline-none transition-all duration-200 ring-0 focus:ring-1 ${accentClasses.focusRingClass} border border-transparent focus:${accentClasses.borderClass}`}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 px-3">
            <h3 className={`text-[0.65rem] font-bold ${themeClasses.textMuted} uppercase tracking-[0.2em]`}>
              Folders
            </h3>
            <button
              onClick={() => onAddFolder(null)}
              className={`p-1 rounded-md ${themeClasses.textMuted} hover:${themeClasses.text} transition-colors`}
              title="New Folder"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <ul className="space-y-0.5">
            {/* Root "All" node */}
            <li>
              <div
                data-folder-id="root"
                className={`flex items-center gap-2 w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeFolderId === null && !showSettings
                    ? `${accentClasses.bgClass} ${accentClasses.onContrastClass} shadow-lg ${accentClasses.shadowClass}`
                    : dragTargetFolderId === null
                      ? `${accentClasses.borderClass} ${accentClasses.lightClass}`
                      : `${themeClasses.textMuted} ${themeClasses.item} hover:${themeClasses.text}`
                } ${dragTargetFolderId === null ? `ring-2 ${accentClasses.focusRingClass}` : ''}`}
                onClick={() => onFolderChange(null)}
                onContextMenu={(e) => handleContextMenu(e, null)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">Whole Vault</span>
                {activeFolderId === null && !showSettings && (
                  <motion.div layoutId="active-indicator" className={`w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0 ${accentClasses.onContrast === 'white' ? 'bg-white/40' : 'bg-black/40'}`} />
                )}
              </div>
            </li>
            {rootFolders.map((folder) => renderFolderItem(folder, 0))}
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
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 ${
                  showSettings
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="absolute z-[200] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1 min-w-[160px] overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.folderId !== null && (
            <>
              <button
                className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
                onClick={() => {
                  onAddFolder(contextMenu.folderId);
                  setContextMenu(null);
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Subfolder
              </button>
              <button
                className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
                onClick={() => {
                  setRenamingFolderId(contextMenu.folderId);
                  setContextMenu(null);
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              <div className="h-px bg-[#333] my-1" />
              <button
                className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                onClick={() => {
                  if (confirm(`Delete folder and move all entries to root?`)) {
                    onDeleteFolder(contextMenu.folderId!);
                  }
                  setContextMenu(null);
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </>
          )}
          {contextMenu.folderId === null && (
            <button
              className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
              onClick={() => {
                onAddFolder(null);
                setContextMenu(null);
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Folder
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={`p-4 border-t ${themeClasses.border} space-y-3`}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onAddPassword}
          className={`w-full ${accentClasses.bgClass} ${accentClasses.onContrastClass} font-bold py-2.5 px-4 rounded-lg transition-all shadow-lg ${accentClasses.shadowClass} flex items-center justify-center gap-2 text-[0.6rem] uppercase tracking-wider`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Record
        </motion.button>

        {/* Account Banner */}
        <div className={`flex items-center gap-2.5 p-2.5 rounded-lg ${themeClasses.item} border ${themeClasses.border}`}>
          <div className={`w-8 h-8 rounded-lg ${accentClasses.bgClass} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-xs font-bold ${accentClasses.onContrastClass}`}>
              {(username || vaultName).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            {connectionMode === "server" && username ? (
              <>
                <span className={`text-xs font-semibold truncate ${themeClasses.text}`} title={username}>
                  {username}
                </span>
                <span className={`text-[0.5rem] font-bold uppercase tracking-wider ${themeClasses.textMuted} truncate`} title={vaultName}>
                  {vaultName}
                </span>
              </>
            ) : (
              <>
                <span className={`text-xs font-semibold truncate ${themeClasses.text}`} title={vaultName}>
                  {vaultName}
                </span>
                <span className={`text-[0.5rem] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                  Local Vault
                </span>
              </>
            )}
          </div>
          <button
            onClick={onLogout}
            className={`p-1.5 rounded-lg ${themeClasses.textMuted} hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0`}
            title="Lock Vault"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
