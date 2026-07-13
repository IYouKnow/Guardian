import { useState } from "react";
import { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface ImportConfirmModalProps {
  entryCount: number;
  folderCount: number;
  filePath: string;
  onConfirm: (folderName: string) => void;
  onCancel: () => void;
  theme?: Theme;
  accentColor?: AccentColor;
}

function FileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

export default function ImportConfirmModal({
  entryCount,
  folderCount,
  filePath,
  onConfirm,
  onCancel,
  theme = "dark",
  accentColor = "yellow",
}: ImportConfirmModalProps) {
  const [folderName, setFolderName] = useState("Imported");
  const accentClasses = getAccentColorClasses(accentColor, theme);

  const fileName = filePath.split(/[\\/]/).pop() || "Import";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center`}>
            <svg className={`w-5 h-5 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Import Entries</h3>
            <p className="text-xs text-gray-500 mt-0.5">KeePass database</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
              <FileIcon />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Source</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{fileName}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <KeyIcon />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="text-xs text-gray-400">Entries to import</span>
                <span className="text-sm font-bold text-white">{entryCount}</span>
              </div>
            </div>
            {folderCount > 0 && (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <FolderIcon />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Folders</span>
                  <span className="text-sm font-bold text-white">{folderCount}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Folder name</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Imported"
              className={`w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} focus:${accentClasses.borderClass} transition-all`}
            />
            <p className="text-[0.6rem] text-gray-500 mt-1.5 flex items-center gap-1.5">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              All imported entries and folders will be placed under this root folder.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(folderName.trim() || "Imported")}
            disabled={!folderName.trim()}
            className={`flex-1 px-4 py-2.5 ${accentClasses.bgClass} ${accentClasses.hoverBgClass} text-black rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
