import { useState, useRef, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  LockKeyhole,
  User,
  Globe,
  Eye,
  EyeOff,
  FileText,
  Server,
  ShieldAlert,
} from "lucide-react";
import {
  isFileSystemAccessAvailable,
  selectVaultFile,
  readFileFromHandle,
  saveFileHandle,
  loadFileHandle,
} from "@/utils/fileSystem";
import { loadLoginPrefs, saveLoginPrefs } from "@/utils/storage";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import FloatingField from "./FloatingField";
import { cn } from "@/lib/utils";

interface LoginProps {
  onLogin: (mode: "local" | "server", credentials: any) => Promise<void>;
  initialFile?: File | null;
  initialHandle?: FileSystemFileHandle | null;
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

// Request the exact server origin at login time rather than shipping with
// blanket host access. Returns true when access is (or already was) granted.
async function requestServerAccess(serverUrl: string): Promise<boolean> {
  let origin: string;
  try {
    origin = new URL(serverUrl).origin;
  } catch {
    return false;
  }
  if (!chrome.permissions?.request) return true;
  return chrome.permissions.request({ origins: [`${origin}/*`] });
}

export default function Login({ onLogin, initialFile, initialHandle }: LoginProps) {
  const [mode, setMode] = useState<Mode>("local");
  const [masterPassword, setMasterPassword] = useState("");

  const [vaultFile, setVaultFile] = useState<File | null>(initialFile || null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(initialHandle || null);

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

  useEffect(() => {
    if (useFileSystemAPI && !initialHandle && !initialFile) {
      loadFileHandle()
        .then(({ handle, metadata }) => {
          if (handle) {
            setFileHandle(handle);
            readFileFromHandle(handle)
              .then((file) => setVaultFile(file))
              .catch((err) => console.warn("Could not read file from saved handle:", err));
          } else if (metadata) {
            setVaultFile(new File([], metadata.fileName));
          }
        })
        .catch(console.error);
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
        if (err.message !== "File selection cancelled") {
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
        const granted = await requestServerAccess(serverUrl);
        if (!granted) {
          setLoginError("Guardian needs permission to connect to this server.");
          return;
        }
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
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-background p-6 font-sans text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-center"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/15">
              <LockKeyhole className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Guardian</h1>
          </div>
          <motion.p
            key={subLabel}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground"
          >
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full transition-colors",
                loginError
                  ? "bg-destructive"
                  : capsLockOn
                    ? "bg-primary"
                    : "bg-primary"
              )}
            />
            {subLabel}
          </motion.p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <div
            role="group"
            aria-label="Vault mode"
            className="mb-6 flex gap-1 rounded-lg bg-muted p-1"
          >
            {([
              { value: "local" as Mode, label: "Local file", icon: FileText },
              { value: "server" as Mode, label: "Server", icon: Server },
            ]).map(({ value, label, icon: Icon }) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (value === mode) return;
                    setMode(value);
                    setLoginError("");
                    setMasterPassword("");
                    setShowMasterPassword(false);
                    setCapsLockOn(false);
                    setServerUrl("http://localhost:8080");
                    setUsername("");
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          <motion.form
            onSubmit={handleLogin}
            className="space-y-3"
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
                  <span className="ml-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Vault file
                  </span>
                  {vaultFile ? (
                    <button
                      type="button"
                      onClick={handleSelectVault}
                      disabled={isLoadingFromHandle}
                      className="group flex w-full items-center gap-3 rounded-md border border-input bg-card px-3 py-2.5 text-left transition-colors hover:border-ring/60"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-secondary">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">
                          {vaultFile.name || "Vault"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatFileSize(vaultFile.size) || "Saved vault"}
                          {fileHandle ? " • Remembered" : ""}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                        Change
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectVault}
                      disabled={isLoadingFromHandle}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-xs text-muted-foreground transition-colors hover:border-ring/60 hover:text-foreground"
                    >
                      {isLoadingFromHandle ? (
                        <>
                          <Spinner className="h-3.5 w-3.5" /> Opening…
                        </>
                      ) : (
                        "Select your .guardian vault"
                      )}
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
                    icon={<Globe className="h-3.5 w-3.5" />}
                  />
                  <FloatingField
                    id="login-username"
                    label="Username"
                    value={username}
                    onChange={setUsername}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    icon={<User className="h-3.5 w-3.5" />}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <FloatingField
                id="login-master-password"
                label={mode === "server" ? "Account password" : "Master password"}
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
                icon={<Lock className="h-3.5 w-3.5" />}
                rightSlot={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={showMasterPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowMasterPassword((s) => !s)}
                    className="text-muted-foreground"
                  >
                    {showMasterPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                }
              />
              <AnimatePresence>
                {capsLockOn && !loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="ml-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground"
                  >
                    <ShieldAlert className="h-3 w-3" />
                    Caps Lock is on
                  </motion.p>
                )}
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="alert"
                    className="ml-1 text-[10px] font-medium text-destructive"
                  >
                    {loginError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <Button type="submit" disabled={isLoading} className="mt-3 w-full gap-2">
              {isLoading ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  {mode === "server" ? "Authenticating…" : "Unlocking…"}
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  {mode === "server" ? "Login" : "Unlock"}
                </>
              )}
            </Button>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}
