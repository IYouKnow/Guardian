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
  onRequestFolderDelete?: (id: string) => void;
  onAddPassword: () => void;
  onLogout: () => void;
  onSettings: () => void;
  showSettings: boolean;
  theme: Theme;
  accentColor: AccentColor;
  connectionMode: "local" | "server";
  vaultName: string;
  username?: string | null;
  dragTargetFolderId?: string | null;
  onReorderFolder: (folderId: string, targetIndex: number) => void;
  onMoveFolder: (folderId: string, newParentId: string | null) => void;
  onReorderFolderCrossParent: (folderId: string, newParentId: string | null, targetIndex: number) => void;
}

function getChildFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parentId === parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export default function Sidebar({
  folders,
  activeFolderId,
  onFolderChange,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onRequestFolderDelete,
  onAddPassword,
  onLogout,
  onSettings,
  showSettings,
  theme,
  accentColor,
  connectionMode,
  vaultName,
  username,
  dragTargetFolderId,
  onReorderFolder,
  onMoveFolder,
  onReorderFolderCrossParent,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: string | null } | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const draggedFolderRef = useRef<string | null>(null);
  const dropTargetRef = useRef<string | null>(null);
  const dropPosRef = useRef<'before' | 'into' | 'after'>('after');
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'into' | 'after'>('after');
  const [folderDragPos, setFolderDragPos] = useState<{ x: number; y: number } | null>(null);
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

  const requestDeleteRef = useRef(onRequestFolderDelete);
  const deleteFolderRef = useRef(onDeleteFolder);
  requestDeleteRef.current = onRequestFolderDelete;
  deleteFolderRef.current = onDeleteFolder;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && activeFolderId && !renamingFolderId) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;
        e.preventDefault();
        if (requestDeleteRef.current) {
          requestDeleteRef.current(activeFolderId);
        } else {
          deleteFolderRef.current(activeFolderId);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeFolderId, renamingFolderId]);

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

  // Pointer-based drag for folder reorder/move
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleFolderPointerDown = (e: React.PointerEvent, folderId: string) => {
    if (renamingFolderId) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    draggedFolderRef.current = folderId;
  };

  const handleFolderPointerMove = (e: React.PointerEvent, _folderId: string) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    if (dx < 4 && dy < 4) return;
    setFolderDragPos({ x: e.clientX, y: e.clientY });

    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const sidebarRect = sidebar.getBoundingClientRect();
    if (e.clientX < sidebarRect.left || e.clientX > sidebarRect.right || e.clientY < sidebarRect.top || e.clientY > sidebarRect.bottom) {
      dropTargetRef.current = null;
      setDropTargetId(null);
      return;
    }

    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const folderEl = elements.find((el) => el.hasAttribute('data-folder-id'));
    const fid = folderEl?.getAttribute('data-folder-id');
    if (!fid || fid === draggedFolderRef.current) {
      dropTargetRef.current = null;
      setDropTargetId(null);
      return;
    }

    dropTargetRef.current = fid;
    const rect = folderEl!.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    let pos: 'before' | 'into' | 'after' = 'after';
    if (ratio < 0.25) pos = 'before';
    else if (ratio > 0.75) pos = 'after';
    else pos = 'into';
    dropPosRef.current = pos;
    setDropTargetId(fid);
    setDropPosition(pos);
  };

  const handleFolderPointerUp = (e: React.PointerEvent, folderId: string) => {
    const draggedId = draggedFolderRef.current;
    if (draggedId && draggedId === folderId) {
      const start = dragStartRef.current;
      if (start) {
        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        if (dx >= 4 || dy >= 4) {
          const targetId = dropTargetRef.current;
          const pos = dropPosRef.current;
          if (targetId && targetId !== draggedId) {
            if (pos === 'into') {
              const newParent = targetId === 'root' ? null : targetId;
              onMoveFolder(draggedId, newParent);
            } else {
              const draggedFolder = folders.find(f => f.id === draggedId);
              const targetFolder = folders.find(f => f.id === targetId);
              if (draggedFolder && targetFolder) {
                const targetParentId = targetFolder.parentId;
                // Compute insert index among target's siblings (including dragged if same parent)
                const siblings = folders
                  .filter(f => f.parentId === targetParentId || f.id === draggedId)
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const targetIndex = siblings.findIndex(f => f.id === targetId);
                if (targetIndex !== -1) {
                  const insertIndex = pos === 'before' ? targetIndex : targetIndex + 1;
                  const sameParent = draggedFolder.parentId === targetParentId;
                  if (sameParent) {
                    onReorderFolder(draggedId, insertIndex);
                  } else {
                    onReorderFolderCrossParent(draggedId, targetParentId, insertIndex);
                  }
                }
              }
            }
          }
        }
      }
    }
    draggedFolderRef.current = null;
    dropTargetRef.current = null;
    dropPosRef.current = 'after';
    setDropTargetId(null);
    setFolderDragPos(null);
    dragStartRef.current = null;
  };

  const renderFolderItem = (folder: Folder, depth: number) => {
    const children = getChildFolders(folders, folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = activeFolderId === folder.id;
    const isRenaming = renamingFolderId === folder.id;
    const isDropTarget = dropTargetId === folder.id;
    const isDragging = draggedFolderRef.current === folder.id;

    return (
      <li key={folder.id} className="relative">
        {isDropTarget && dropPosition === 'before' && (
          <div className={`absolute -top-[2px] left-0 right-0 h-[3px] rounded-full z-10 ${accentClasses.bgClass}`} />
        )}
        {isDropTarget && dropPosition === 'after' && (
          <div className={`absolute -bottom-[2px] left-0 right-0 h-[3px] rounded-full z-10 ${accentClasses.bgClass}`} />
        )}
        <div
          data-folder-id={folder.id}
          className={`group relative flex items-center gap-1 w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer touch-none select-none ${
            isActive && !showSettings
              ? `${accentClasses.textClass} ${accentClasses.lightClass}`
              : dragTargetFolderId === folder.id
                ? `${accentClasses.borderClass} ${accentClasses.lightClass}`
                : `${themeClasses.textMuted} ${themeClasses.item} hover:${themeClasses.text}`
          } ${dragTargetFolderId === folder.id ? `ring-2 ${accentClasses.focusRingClass}` : ''} ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? dropPosition === 'into' ? `${accentClasses.textClass} ${accentClasses.lightClass}` : `${accentClasses.lightClass}` : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => onFolderChange(folder.id)}
          onDoubleClick={() => { if (children.length > 0) toggleExpand(folder.id); }}
          onContextMenu={(e) => handleContextMenu(e, folder.id)}
          onPointerDown={(e) => handleFolderPointerDown(e, folder.id)}
          onPointerMove={(e) => handleFolderPointerMove(e, folder.id)}
          onPointerUp={(e) => handleFolderPointerUp(e, folder.id)}
        >
          {children.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(folder.id); }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`w-4 h-4 flex items-center justify-center flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-4 h-4 flex-shrink-0" />
          )}
          {folder.icon ? (
            <img src={folder.icon} alt="" className="w-4 h-4 flex-shrink-0 rounded object-cover" />
          ) : children.length > 0 ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v1.586A1.98 1.98 0 0019.414 10H4.586A1.98 1.98 0 002 11.586V18a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-9l-2-2H4a2 2 0 00-2 2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          )}
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
          {isDropTarget && (
            <span className={`ml-auto flex-shrink-0 text-[0.5rem] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${dropPosition === 'into' ? 'bg-white/20' : 'bg-white/10'}`}>
              {dropPosition === 'into' ? 'Nest' : dropPosition === 'before' ? 'Above' : 'Below'}
            </span>
          )}
          {isActive && !showSettings && (
            <motion.div layoutId="active-indicator" className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${accentClasses.onContrast === 'white' ? 'bg-white/40' : 'bg-black/40'}`} />
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
      <div className={`px-5 py-4 border-b ${themeClasses.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg ${accentClasses.bgClass} flex items-center justify-center shadow-sm`}>
            <svg className={`w-4 h-4 ${accentClasses.onContrastClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className={`text-base font-bold tracking-tight ${themeClasses.text}`}>Guardian</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-5">
        {/* All Entries - standalone button */}
        <div>
          <button
            data-folder-id="root"
            onClick={() => onFolderChange(null)}
            onContextMenu={(e) => handleContextMenu(e, null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeFolderId === null && !showSettings
                ? `${accentClasses.bgClass} ${accentClasses.onContrastClass} shadow-lg ${accentClasses.shadowClass}`
                : `${themeClasses.textMuted} ${themeClasses.item} hover:${themeClasses.text}`
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="truncate">All Entries</span>
            {activeFolderId === null && !showSettings && (
              <motion.div layoutId="active-indicator" className={`w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0 ${accentClasses.onContrast === 'white' ? 'bg-white/40' : 'bg-black/40'}`} />
            )}
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5 px-3">
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
            {rootFolders.map((folder) => renderFolderItem(folder, 0))}
          </ul>
        </div>

        <div className={`pt-4 border-t ${themeClasses.border}`}>
          <h3 className={`text-[0.65rem] font-bold ${themeClasses.textMuted} uppercase tracking-[0.2em] mb-2.5 px-3`}>
            System
          </h3>
          <ul className="space-y-0.5">
            <li>
              <button
                onClick={onSettings}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 ${
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
                  if (onRequestFolderDelete) {
                    onRequestFolderDelete(contextMenu.folderId!);
                  } else if (confirm(`Delete folder and move all entries to root?`)) {
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
      <div className={`p-3 border-t ${themeClasses.border} space-y-2.5`}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onAddPassword}
          className={`w-full ${accentClasses.bgClass} ${accentClasses.onContrastClass} font-bold py-2 px-3 rounded-lg transition-all shadow-lg ${accentClasses.shadowClass} flex items-center justify-center gap-2 text-[0.6rem] uppercase tracking-wider`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Record
        </motion.button>

        {/* Account Banner */}
        <div className={`flex items-center gap-2 p-2 rounded-lg ${themeClasses.item} border ${themeClasses.border}`}>
          <div className={`w-7 h-7 rounded-lg ${accentClasses.bgClass} flex items-center justify-center flex-shrink-0`}>
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
      {/* Folder Drag Preview */}
      {folderDragPos && draggedFolderRef.current && (() => {
        const f = folders.find(f => f.id === draggedFolderRef.current);
        if (!f) return null;
        return (
          <div
            className="fixed z-[300] pointer-events-none flex items-center gap-1.5 bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 shadow-2xl shadow-black/60 whitespace-nowrap"
            style={{ left: folderDragPos.x, top: folderDragPos.y - 22, width: 140 }}
          >
            <div className={`w-4 h-4 rounded ${accentClasses.bgClass} flex items-center justify-center flex-shrink-0`}>
              <svg className={`w-2.5 h-2.5 ${accentClasses.onContrastClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="text-[0.65rem] font-semibold text-white truncate">{f.name}</span>
          </div>
        );
      })()}

    </aside>
  );
}
