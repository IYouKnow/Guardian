import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Folder, PasswordEntry } from "../types";

interface FolderDeleteModalProps {
  folderId: string;
  folders: Folder[];
  passwords: PasswordEntry[];
  onConfirm: (includeSubfolders: boolean) => void;
  onCancel: () => void;
}

function FolderSubfoldersIcon() {
  return (
    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function FolderDeleteModal({ folderId, folders, passwords, onConfirm, onCancel }: FolderDeleteModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const directSubfolders = useMemo(() => {
    return folders.filter(f => f.parentId === folderId);
  }, [folderId, folders]);

  const entryCount = useMemo(() => {
    const descendantIds = new Set<string>();
    const collectIds = (parentId: string) => {
      for (const f of folders) {
        if (f.parentId === parentId) {
          descendantIds.add(f.id);
          collectIds(f.id);
        }
      }
    };
    descendantIds.add(folderId);
    collectIds(folderId);
    return passwords.filter(p => p.folderId && descendantIds.has(p.folderId)).length;
  }, [folderId, folders, passwords]);

  const folderName = useMemo(() => {
    return folders.find(f => f.id === folderId)?.name || "folder";
  }, [folderId, folders]);

  const hasSubfolders = directSubfolders.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 w-full max-w-sm"
      >
        <div className="mb-6">
          <p className="text-sm text-gray-300 font-medium">
            Delete folder <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-white font-semibold text-xs tracking-wide">{folderName}</span>? {entryCount} entr{entryCount === 1 ? 'y' : 'ies'} will be moved to root.
          </p>
        </div>

        {hasSubfolders ? (
          <div className="space-y-2">
            <button
              onClick={() => onConfirm(false)}
              className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] flex items-center justify-center shrink-0 transition-colors">
                <FolderSubfoldersIcon />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-200">Delete folder only</p>
                <p className="text-[0.65rem] text-gray-600 mt-0.5">
                  {directSubfolders.length} subfolder{directSubfolders.length === 1 ? '' : 's'} move to root level
                </p>
              </div>
            </button>
            <button
              onClick={() => onConfirm(true)}
              className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/[0.06] hover:bg-red-500/[0.1] border border-red-500/[0.1] hover:border-red-500/[0.2] transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/[0.08] group-hover:bg-red-500/[0.12] flex items-center justify-center shrink-0 transition-colors">
                <FolderIcon />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-300">Delete all</p>
                <p className="text-[0.65rem] text-red-400/50 mt-0.5">{entryCount} entries moved to root</p>
              </div>
            </button>
            <button
              onClick={onCancel}
              className="w-full text-center pt-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(true)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all"
            >
              Delete
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
