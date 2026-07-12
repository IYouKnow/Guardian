import { useState } from "react";

interface ImportConfirmModalProps {
  entryCount: number;
  folderCount: number;
  filePath: string;
  onConfirm: (folderName: string) => void;
  onCancel: () => void;
}

export default function ImportConfirmModal({
  entryCount,
  folderCount,
  filePath,
  onConfirm,
  onCancel,
}: ImportConfirmModalProps) {
  const [folderName, setFolderName] = useState("Imported");

  const fileName = filePath.split(/[\\/]/).pop() || "Import";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-xl font-bold text-white mb-4">Import Entries</h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Source</p>
            <p className="text-xs text-gray-500 truncate">{fileName}</p>
          </div>

          <div className={`p-3 rounded-xl bg-white/[0.02] border border-white/5`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Entries to import</span>
              <span className="text-sm font-bold text-white">{entryCount}</span>
            </div>
            {folderCount > 0 && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">Folders</span>
                <span className="text-sm font-bold text-white">{folderCount}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Folder name</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Imported"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
            />
            <p className="text-[0.6rem] text-gray-500 mt-1">
              All imported entries and folders will be placed under this root folder.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(folderName.trim() || "Imported")}
            disabled={!folderName.trim()}
            className="flex-1 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
