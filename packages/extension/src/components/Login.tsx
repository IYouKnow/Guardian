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
import { loadLoginPrefs, saveLoginPrefs } from "../utils/storage";
import FloatingField from "./FloatingField";

interface LoginProps {
  onLogin: (mode: "local" | "server", credentials: any) => Promise<void>;
  initialFile?: File | null;
  initialHandle?: FileSystemFileHandle | null;
  theme?: Theme;
  accentColor?: AccentColor;
}

type Mode = "local" | "server";

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export default function Login({
  onLogin,
  initialFile,
  initialHandle,
  theme = "dark",
  accentColor = "yellow"
}: LoginProps) {
  const [mode, setMode] = useState<Mode>("local");
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
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const useFileSystemAPI = isFileSystemAccessAvailable();

  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor);

  // Load persisted login prefs on mount (non-secret: last mode, server
  // URL, username). Do this before any UI that depends on `mode` can
  // settle so it doesn't flash to Local first.
  useEffect(() => {
    loadLoginPrefs()
      .then((prefs) => {
        if (prefs.lastMode === "local" || prefs.lastMode === "server") {
          setMode(prefs.lastMode);
        }
        if (prefs.serverUrl) setServerUrl(prefs.serverUrl);
        if (prefs.username) setUsername(prefs.username);
      })
      .finally(() => setPrefsLoaded(true));
  }, []);

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

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Detect Caps Lock state from any keyboard event on the field.
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
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
        void saveLoginPrefs({ lastMode: "local" });
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
        void saveLoginPrefs({ lastMode: "server", serverUrl, username });
      } catch (err) {
        console.error("Error logging in to server:", err);
        setLoginError(err instanceof Error ? err.message : "Authentication failed.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const subLabel =
    mode === "server"
      ? serverUrl
        ? `Connecting to ${formatHost(serverUrl)}`
        : "Sign in with your server account"
      : vaultFile?.name
        ? `Unlocking ${vaultFile.name}`
        : "Unlock your local vault";

  return (
    <div className={`relative flex h-full w-full font-sans ${themeClasses.bg} ${themeClasses.text} items-center justify-center p-6 overflow-hidden transition-colors duration-500`}>
      {/* Animated background blobs */}
      <motion.div
        aria-hidden
        className={`absolute top-[-25%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[80px] opacity-10 ${accentClasses.bgClass} pointer-events-none`}
        animate={{
          x: [0, 24, -12, 0],
          y: [0, -18, 14, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className={`absolute bottom-[-25%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[80px] opacity-5 ${accentClasses.bgClass} pointer-events-none`}
        animate={{
          x: [0, -18, 12, 0],
          y: [0, 20, -10, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Hero: horizontal icon + wordmark lockup */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-6"
        >
          <div className="flex items-center gap-2.5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${accentClasses.lightClass} border ${accentClasses.borderClass}`}>
              <svg className={`w-5 h-5 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-[1.65rem] font-semibold tracking-tight leading-none">Guardian</h1>
          </div>
          <motion.p
            key={subLabel}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${themeClasses.textSecondary} text-[11px] font-medium flex items-center justify-center gap-1.5 mt-2.5`}
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                loginError
                  ? "bg-red-400"
                  : capsLockOn
                    ? "bg-amber-400"
                    : accentClasses.bgClass
              }`}
            />
            {subLabel}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Tabs with a sliding indicator */}
          <div className="relative flex p-1 mb-6 bg-black/20 rounded-xl">
            {(["local", "server"] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setLoginError("");
                  }}
                  className={`relative flex-1 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider rounded-lg transition-colors z-10 ${active ? "text-black" : `${themeClasses.textTertiary} hover:${themeClasses.text}`}`}
                >
                  {active && (
                    <motion.span
                      layoutId="login-tab-pill"
                      className={`absolute inset-0 rounded-lg ${accentClasses.bgClass} shadow-lg`}
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative">{m === "local" ? "Local File" : "Server"}</span>
                </button>
              );
            })}
          </div>

          <motion.form
            onSubmit={handleLogin}
            className="space-y-4"
            animate={loginError && !isLoading ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <AnimatePresence mode="wait">
              {mode === "local" ? (
                <motion.div
                  key="local-pane"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-1.5"
                >
                  <label className={`block text-[0.6rem] font-bold uppercase tracking-wider ${themeClasses.textTertiary} ml-1`}>
                    Vault File
                  </label>
                  {vaultFile ? (
                    <button
                      type="button"
                      onClick={handleSelectVault}
                      disabled={isLoadingFromHandle}
                      className={`group w-full flex items-center gap-3 ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-2.5 text-left hover:border-white/10 transition-colors`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${accentClasses.lightClass} border border-white/5 flex-shrink-0`}>
                        <svg className={`w-4 h-4 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${themeClasses.text} truncate`}>
                          {vaultFile.name || "Vault"}
                        </div>
                        <div className={`text-[10px] ${themeClasses.textTertiary}`}>
                          {formatFileSize(vaultFile.size) || "Saved vault"}
                          {fileHandle ? " • Remembered" : ""}
                        </div>
                      </div>
                      <span className={`text-[0.6rem] font-bold uppercase tracking-wider ${themeClasses.textTertiary} group-hover:${themeClasses.text}`}>
                        Change
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectVault}
                      disabled={isLoadingFromHandle}
                      className={`w-full flex items-center justify-center gap-2 border-2 border-dashed ${themeClasses.border} hover:${accentClasses.borderClass} rounded-xl px-3 py-4 text-xs ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {isLoadingFromHandle ? "Opening..." : "Select your .guardian vault"}
                    </button>
                  )}
                  {!useFileSystemAPI && (
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".guardian"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="server-pane"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3"
                >
                  <FloatingField
                    id="login-server-url"
                    label="Server URL"
                    value={serverUrl}
                    onChange={setServerUrl}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    theme={theme}
                    accentColor={accentColor}
                    icon={
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 1018 0 9 9 0 00-18 0zm9-9a9 9 0 019 9m-9-9a9 9 0 00-9 9m9-9v18m9-9H3" />
                      </svg>
                    }
                  />
                  <FloatingField
                    id="login-username"
                    label="Username"
                    value={username}
                    onChange={setUsername}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    theme={theme}
                    accentColor={accentColor}
                    icon={
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <FloatingField
                id="login-master-password"
                label={mode === "server" ? "Account Password" : "Master Password"}
                type={showMasterPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(v) => {
                  setMasterPassword(v);
                  setLoginError("");
                }}
                onKeyDown={handlePasswordKey}
                onKeyUp={handlePasswordKey}
                onBlur={() => setCapsLockOn(false)}
                autoFocus={prefsLoaded && (mode === "local" ? !!vaultFile : !!username)}
                theme={theme}
                accentColor={accentColor}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowMasterPassword(!showMasterPassword)}
                    aria-label={showMasterPassword ? "Hide password" : "Show password"}
                    className={`${themeClasses.textTertiary} hover:${themeClasses.text} transition-colors p-1`}
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
                }
              />
              <AnimatePresence>
                {capsLockOn && !loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-amber-400 text-[10px] font-medium ml-1 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Caps Lock is on
                  </motion.p>
                )}
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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
              className={`w-full py-3 rounded-xl ${accentClasses.bgClass} text-black font-bold text-[0.65rem] uppercase tracking-wider shadow-lg ${accentClasses.shadowClass} disabled:opacity-50 flex items-center justify-center gap-2 mt-6 active:scale-95 hover:brightness-110 transition-all`}
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
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}
