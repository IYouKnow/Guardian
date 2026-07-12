import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

interface KdbxPasswordModalProps {
  onConfirm: (password: string, keyFilePath?: string) => void;
  onCancel: () => void;
  error?: string;
}

export default function KdbxPasswordModal({ onConfirm, onCancel, error }: KdbxPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [keyFilePath, setKeyFilePath] = useState<string | null>(null);
  const [showKeyFile, setShowKeyFile] = useState(false);

  const handlePickKeyFile = async () => {
    const filePath = await open({
      title: "Select KeePass key file",
      filters: [{ name: "Key Files", extensions: ["key", "kdbx", "*"] }],
      multiple: false,
    });
    if (filePath && typeof filePath === "string") {
      setKeyFilePath(filePath);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/20 border-2 border-yellow-400/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">KeePass Database</h3>
            <p className="text-xs text-gray-500">Enter credentials to unlock</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs mb-4">{error}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Master Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter KeePass master password"
              autoFocus
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
              onKeyDown={(e) => { if (e.key === "Enter" && password) onConfirm(password, keyFilePath || undefined); }}
            />
          </div>

          {showKeyFile && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Key File (optional)</label>
              <div className="flex items-center gap-2">
                <span className={`flex-1 text-xs truncate ${keyFilePath ? 'text-gray-300' : 'text-gray-500'}`}>
                  {keyFilePath || "No key file selected"}
                </span>
                <button
                  onClick={handlePickKeyFile}
                  className="shrink-0 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-xs font-medium transition-all"
                >
                  {keyFilePath ? "Change" : "Browse"}
                </button>
                {keyFilePath && (
                  <button onClick={() => setKeyFilePath(null)} className="text-gray-500 hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowKeyFile(!showKeyFile)}
            className="text-[0.6rem] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showKeyFile ? "— Hide key file option" : "+ Add key file"}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-sm font-medium transition-all">Cancel</button>
          <button
            onClick={() => onConfirm(password, keyFilePath || undefined)}
            disabled={!password}
            className="flex-1 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
