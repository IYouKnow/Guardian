import { useState, useRef, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";
import { getThemeClasses } from "../utils/theme";
import {
  isFileSystemAccessAvailable,
  selectVaultFile,
  readFileFromHandle,
  saveFileHandle,
  loadFileHandle
} from "../utils/fileSystem";

interface LoginProps {
  onLogin: (mode: "local" | "server", credentials: any) => Promise<void>;
  initialFile?: File | null;
  initialHandle?: FileSystemFileHandle | null;
  theme?: Theme;
  accentColor?: AccentColor;
}

export default function Login({
  onLogin,
  initialFile,
  initialHandle,
  theme = "dark",
  accentColor = "yellow"
}: LoginProps) {
  const [mode, setMode] = useState<"local" | "server">("local");
  const [masterPassword, setMasterPassword] = useState("");

  // Local File State
  const [vaultFile, setVaultFile] = useState<File | null>(initialFile || null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(initialHandle || null);

  // Server State
  const [serverUrl, setServerUrl] = useState("http://localhost:8080");
  const [username, setUsername] = useState("");

  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFromHandle, setIsLoadingFromHandle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const useFileSystemAPI = isFileSystemAccessAvailable();

  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor);

  // Try to load file handle on mount
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
      }
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (masterPassword.length < 8) {
      setLoginError("Password must be at least 8 characters.");
      return;
    }

    if (mode === "local") {
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

      setIsLoading(true);
      try {
        await onLogin("local", { file: fileToUse, password: masterPassword, handle: fileHandle });
      } catch (err) {
        console.error("Error loading vault:", err);
        setLoginError(err instanceof Error ? err.message : "Invalid password or corrupted vault.");
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!serverUrl || !username) {
        setLoginError("Please enter server URL and username.");
        return;
      }

      setIsLoading(true);
      try {
        await onLogin("server", { url: serverUrl, username, password: masterPassword });
      } catch (err) {
        console.error("Error logging in to server:", err);
        setLoginError(err instanceof Error ? err.message : "Authentication failed.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={`relative flex h-full w-full font-sans ${themeClasses.bg} ${themeClasses.text} items-center justify-center p-6 overflow-hidden transition-colors duration-500`}>
      {/* Background gradients */}
      <div className={`absolute top-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[80px] opacity-10 ${accentClasses.bgClass} transition-colors duration-700 pointer-events-none`} />
      <div className={`absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[80px] opacity-5 ${accentClasses.bgClass} transition-colors duration-700 pointer-events-none`} />

      <div className="relative z-10 w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${accentClasses.lightClass} border border-white/5 mb-3 shadow-xl`}>
            <svg className={`w-6 h-6 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Guardian</h1>
          <p className={`${themeClasses.textSecondary} text-xs font-medium`}>Secure Password Vault</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${themeClasses.sectionBg} rounded-2xl border ${themeClasses.border} overflow-hidden shadow-2xl p-6`}
        >
          {/* Tabs */}
          <div className="flex p-1 mb-6 bg-black/20 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("local")}
              className={`flex-1 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider rounded-lg transition-all ${mode === "local" ? `${accentClasses.bgClass} text-black shadow-lg` : `${themeClasses.textTertiary} hover:${themeClasses.text}`}`}
            >
              Local File
            </button>
            <button
              type="button"
              onClick={() => setMode("server")}
              className={`flex-1 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider rounded-lg transition-all ${mode === "server" ? `${accentClasses.bgClass} text-black shadow-lg` : `${themeClasses.textTertiary} hover:${themeClasses.text}`}`}
            >
              Server
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            {mode === "local" ? (
              <div className="space-y-1.5">
                <label className={`block text-[0.6rem] font-bold uppercase tracking-wider ${themeClasses.textTertiary} ml-1`}>
                  Vault File
                </label>
                <div className="flex gap-2">
                  <div className={`flex-1 relative group`}>
                    <input
                      type="text"
                      value={vaultFile?.name || "No file selected"}
                      readOnly
                      className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-2.5 text-xs ${themeClasses.text} truncate outline-none`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectVault}
                    disabled={isLoadingFromHandle}
                    className={`px-3 py-2 rounded-xl ${themeClasses.inputBg} border ${themeClasses.border} ${themeClasses.hoverBg} transition-colors border-white/5 font-bold text-[0.6rem] uppercase tracking-wider`}
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
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className={`block text-[0.6rem] font-bold uppercase tracking-wider ${themeClasses.textTertiary} ml-1`}>
                    Server URL
                  </label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:8080"
                    className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} focus:${accentClasses.borderClass} rounded-xl px-3 py-2.5 text-xs ${themeClasses.text} placeholder-gray-600 outline-none transition-all duration-200 ring-0 focus:ring-1 ${accentClasses.focusRingClass}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`block text-[0.6rem] font-bold uppercase tracking-wider ${themeClasses.textTertiary} ml-1`}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} focus:${accentClasses.borderClass} rounded-xl px-3 py-2.5 text-xs ${themeClasses.text} placeholder-gray-600 outline-none transition-all duration-200 ring-0 focus:ring-1 ${accentClasses.focusRingClass}`}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className={`block text-[0.6rem] font-bold uppercase tracking-wider ${themeClasses.textTertiary} ml-1`}>
                {mode === "server" ? "Account Password" : "Master Password"}
              </label>
              <div className="relative">
                <input
                  type={showMasterPassword ? "text" : "password"}
                  value={masterPassword}
                  onChange={(e) => {
                    setMasterPassword(e.target.value);
                    setLoginError("");
                  }}
                  placeholder="Password"
                  className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} focus:${accentClasses.borderClass} rounded-xl px-3 py-2.5 pr-10 text-xs ${themeClasses.text} placeholder-gray-600 outline-none transition-all duration-200 ring-0 focus:ring-1 ${accentClasses.focusRingClass}`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${themeClasses.textTertiary} hover:${themeClasses.text} transition-colors p-1`}
                >
                  {showMasterPassword ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <AnimatePresence>
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-[10px] font-medium ml-1"
                  >
                    {loginError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl ${accentClasses.bgClass} text-black font-bold text-[0.65rem] uppercase tracking-wider shadow-lg ${accentClasses.shadowClass} disabled:opacity-50 flex items-center justify-center gap-2 mt-6 active:scale-95 transition-transform`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-3 h-3 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === "server" ? "Authenticating..." : "Unlocking..."}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {mode === "server" ? "Login" : "Unlock"}
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
