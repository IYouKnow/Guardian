import { useState, useRef, useEffect, type FormEvent } from "react";
import { openVault } from "../../../shared/crypto";
import {
  isFileSystemAccessAvailable,
  selectVaultFile,
  readFileFromHandle,
  saveFileHandle,
  loadFileHandle
} from "../utils/fileSystem";
import { saveFileHandleMetadata } from "../utils/storage";
import { motion } from "framer-motion";

interface LoginProps {
  onLogin: (file: File, masterPassword: string, handle?: FileSystemFileHandle) => void;
  initialFile?: File | null;
  initialHandle?: FileSystemFileHandle | null;
}

export default function Login({ onLogin, initialFile, initialHandle }: LoginProps) {
  const [masterPassword, setMasterPassword] = useState("");
  const [vaultFile, setVaultFile] = useState<File | null>(initialFile || null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(initialHandle || null);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFromHandle, setIsLoadingFromHandle] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const useFileSystemAPI = isFileSystemAccessAvailable();

  // Try to load file handle on mount (only if no initial file/Handle provided)
  useEffect(() => {
    if (useFileSystemAPI && !initialHandle && !initialFile) {
      loadFileHandle().then(({ handle, metadata }) => {
        if (handle) {
          setFileHandle(handle);
          readFileFromHandle(handle)
            .then((file) => {
              setVaultFile(file);
            })
            .catch((err) => {
              console.warn("Could not read file from saved handle:", err);
            });
        } else if (metadata) {
          setVaultFile(new File([], metadata.fileName));
        }
      }).catch(console.error);
    }
  }, [useFileSystemAPI, initialHandle, initialFile]);

  const handleSelectVault = async () => {
    if (useFileSystemAPI) {
      try {
        setIsLoadingFromHandle(true);
        const { handle, file } = await selectVaultFile();
        setFileHandle(handle);
        setVaultFile(file);
        setLoginError("");
        await saveFileHandle(handle);
        await saveFileHandleMetadata({
          fileName: file.name,
          lastModified: file.lastModified,
          name: handle.name,
          kind: handle.kind,
        });
      } catch (err: any) {
        if (err.message !== 'File selection cancelled') {
          console.error("Error selecting file:", err);
          setLoginError(err.message || "Failed to select file");
        }
      } finally {
        setIsLoadingFromHandle(false);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVaultFile(file);
      setLoginError("");
      if (useFileSystemAPI && (file as any).handle) {
        const handle = (file as any).handle;
        setFileHandle(handle);
        await saveFileHandle(handle);
        await saveFileHandleMetadata({
          fileName: file.name,
          lastModified: file.lastModified,
          name: handle.name,
          kind: handle.kind,
        });
      }
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    let fileToUse = vaultFile;
    if (useFileSystemAPI && fileHandle) {
      try {
        fileToUse = await readFileFromHandle(fileHandle);
        setVaultFile(fileToUse);
      } catch (err) {
        console.warn("Could not read from handle, using cached file:", err);
      }
    }

    if (!fileToUse) {
      setLoginError("Select your vault file");
      return;
    }

    if (masterPassword.length < 8) {
      setLoginError("Password must be 8+ characters");
      return;
    }

    setIsLoading(true);

    try {
      const arrayBuffer = await fileToUse.arrayBuffer();
      const vaultBytes = new Uint8Array(arrayBuffer);
      await openVault(masterPassword, vaultBytes);
      onLogin(fileToUse, masterPassword, fileHandle || undefined);
    } catch (err) {
      console.error("Error loading vault:", err);
      setLoginError("Invalid password or corrupted vault.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full h-full bg-[#050505] text-white items-center justify-center p-8 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 mb-5 shadow-inner"
          >
            <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Guardian</h1>
          <p className="text-sm text-gray-500">Secure Password Vault</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400 ml-1">Vault File</label>
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={vaultFile?.name || ""}
                  readOnly
                  placeholder="Select .guardian file..."
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSelectVault}
                disabled={isLoadingFromHandle}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/5 transition-colors active:scale-95"
              >
                {isLoadingFromHandle ? "..." : "Select"}
              </button>
            </div>
            {!useFileSystemAPI && (
              <input
                ref={fileInputRef}
                type="file"
                accept=".guardian"
                onChange={handleFileChange}
                className="hidden"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400 ml-1">Master Password</label>
            <div className="relative group">
              <input
                type={showMasterPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => {
                  setMasterPassword(e.target.value);
                  setLoginError("");
                }}
                placeholder="Enter password..."
                className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 pr-12 text-xs text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-yellow-400/50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword(!showMasterPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showMasterPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {loginError && (
              <p className="mt-2 text-[11px] text-red-400 font-medium ml-1">{loginError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 text-sm mt-8"
          >
            {isLoading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z" />
              </svg>
            )}
            {isLoading ? "Unlocking..." : "Unlock Vault"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
