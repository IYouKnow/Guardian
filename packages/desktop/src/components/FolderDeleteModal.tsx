import { useMemo } from "react";
import { Folder, PasswordEntry } from "../types";

interface FolderDeleteModalProps {
  folderId: string;
  folders: Folder[];
  passwords: PasswordEntry[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FolderDeleteModal({ folderId, folders, passwords, onConfirm, onCancel }: FolderDeleteModalProps) {
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-300">
              Delete <span className="text-white font-semibold">{folderName}</span>?
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{entryCount} entr{entryCount === 1 ? 'y' : 'ies'} will be moved to root.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-sm font-medium transition-all">Cancel</button>
          <button autoFocus onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-all outline-none">Delete</button>
        </div>
      </div>
    </div>
  );
}
