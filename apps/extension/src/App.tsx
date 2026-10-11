import { useState, useEffect, useRef } from "react";
import type { PasswordEntry, Theme, AccentColor } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import Login from "@/components/Login";
import PasswordGrid from "@/components/PasswordGrid";
import PasswordDetail from "@/components/PasswordDetail";
import Settings from "@/components/Settings";
import Generator from "@/components/Generator";
import PasswordPanel from "@/components/PasswordPanel";
import { SyncIndicator } from "@/components/SyncIndicator";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSSE } from "@/hooks/useSSE";
import { openVault, type VaultEntry } from "@guardian/core/crypto/vault";
import { deriveHKDF } from "@guardian/core/crypto/hkdf";
import { deriveKey } from "@guardian/core/crypto/argon2";
import {
  loadSettings,
  saveSettings,
  clearSession,
  saveVault,
  deleteVault,
  loadVaultFromStorage,
  getExtensionMasterSalt,
} from "@/utils/storage";
import {
  getFileMetadata,
  saveFileHandle,
  clearFileHandle,
  loadFileHandle,
} from "@/utils/fileSystem";
import { useExtensionVault } from "@/hooks/useExtensionVault";
import { pushEntriesToServer, deleteEntryFromServer } from "@/utils/serverSync";
import { applyTheme, watchSystemTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function vaultEntryToPasswordEntry(vaultEntry: VaultEntry): PasswordEntry {
  return {
    id: vaultEntry.id,
    title: vaultEntry.name,
    username: vaultEntry.username || "",
    password: vaultEntry.password,
    website: vaultEntry.url || "",
    notes: vaultEntry.notes || "",
    breached: false,
    favicon: vaultEntry.favicon,
  };
}

function passwordEntryToVaultEntry(entry: PasswordEntry): VaultEntry {
  return {
    id: entry.id,
    name: entry.title,
    username: entry.username || undefined,
    password: entry.password,
    url: entry.website || undefined,
    notes: entry.notes || undefined,
    createdAt: entry.lastModified || new Date().toISOString(),
    lastModified: new Date().toISOString(),
    favicon: entry.favicon,
  };
}

type ActiveTab = "vault" | "generator" | "settings";

const TABS: { id: ActiveTab; label: string; icon: typeof Lock }[] = [
  { id: "vault", label: "Vault", icon: Lock },
  { id: "generator", label: "Generator", icon: Wand2 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAutoUnlock, setIsCheckingAutoUnlock] = useState(true);

  const [vaultFile, setVaultFile] = useState<File | null>(null);
  const [vaultFileHandle, setVaultFileHandle] =
    useState<FileSystemFileHandle | null>(null);

  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPassword, setSelectedPassword] = useState<PasswordEntry | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("vault");
  const [theme, setTheme] = useState<Theme>("system");
  const [accentColor, setAccentColor] = useState<AccentColor>("yellow");
  const [clipboardClearSeconds, setClipboardClearSeconds] = useState(10);
  const [revealCensorSeconds, setRevealCensorSeconds] = useState(5);
  const [serverSessionExpiryDays, setServerSessionExpiryDays] = useState(7);
  const [loginMode, setLoginMode] = useState<"local" | "server">("local");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [isAddingPassword, setIsAddingPassword] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);

  const filePollIntervalRef = useRef<number | null>(null);
  const lastFileModifiedRef = useRef<number>(0);
  const lastLocalPushAtRef = useRef<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { loginToServer, syncVault } = useExtensionVault();

  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [localAppKey, setLocalAppKey] = useState<number[] | null>(null);
  const [derivedServerKey, setDerivedServerKey] = useState<number[] | null>(null);
  const { isSyncing, lastEvent } = useSSE(serverUrl, authToken);

  // Apply theme + accent to <html>; children read color tokens.
  useEffect(() => {
    applyTheme(theme, accentColor);
  }, [theme, accentColor]);

  useEffect(() => {
    if (theme !== "system") return;
    return watchSystemTheme(theme, () => applyTheme(theme, accentColor));
  }, [theme, accentColor]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const settings = await loadSettings();
        if (settings.theme) setTheme(settings.theme as Theme);
        if (settings.accentColor) setAccentColor(settings.accentColor as AccentColor);
        if (settings.clipboardClearSeconds) setClipboardClearSeconds(settings.clipboardClearSeconds);
        if (settings.revealCensorSeconds) setRevealCensorSeconds(settings.revealCensorSeconds);
        if (typeof settings.serverSessionExpiryDays === "number" && Number.isFinite(settings.serverSessionExpiryDays)) {
          setServerSessionExpiryDays(Math.max(1, Math.min(365, Math.floor(settings.serverSessionExpiryDays))));
        }

        const session = await new Promise<{ isLoggedIn: boolean; lastModified: number, mode?: 'local' | 'server', serverUrl?: string, authToken?: string, serverKey?: number[], derivedServerKey?: number[], localKey?: number[] }>((resolve) => {
          chrome.runtime.sendMessage({ action: 'getSession' }, (res) => {
            resolve(res || { isLoggedIn: false, lastModified: 0, mode: 'local' });
          });
        });

        const { handle, metadata } = await loadFileHandle();
        if (handle) setVaultFileHandle(handle);
        if (metadata) {
          setVaultFile(new File([], metadata.fileName));
          lastFileModifiedRef.current = metadata.lastModified;
        }

        if (session.isLoggedIn) {
          const storedKey = session.localKey;
          if (storedKey) {
            try {
              const appKey = new Uint8Array(storedKey);
              const decryptedEntries = await loadVaultFromStorage(appKey);
              setPasswords(decryptedEntries.map(vaultEntryToPasswordEntry));
              setIsLoggedIn(true);

              if (session.mode) setLoginMode(session.mode);
              if (session.serverUrl) setServerUrl(session.serverUrl);
              if (session.authToken) setAuthToken(session.authToken);
              if (session.localKey) setLocalAppKey(session.localKey);
              if (session.derivedServerKey) setDerivedServerKey(session.derivedServerKey);
            } catch (err) {
              console.warn("Auto-login decryption failed:", err);
            }
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsCheckingAutoUnlock(false);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const current = await loadSettings();
        await saveSettings({
          ...current,
          theme,
          accentColor,
          clipboardClearSeconds,
          revealCensorSeconds,
          serverSessionExpiryDays,
        });
      } catch (e) {
        console.error("Failed to auto-save settings", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [theme, accentColor, clipboardClearSeconds, revealCensorSeconds, serverSessionExpiryDays]);

  useEffect(() => {
    return () => {
      if (filePollIntervalRef.current) clearInterval(filePollIntervalRef.current);
    };
  }, []);

  const handleLogin = async (mode: "local" | "server", credentials: any) => {
    try {
      let loadedPasswords: PasswordEntry[] = [];
      let lastModified = Date.now();
      let derivedKeyToStore: number[] | undefined;
      let urlToStore: string | undefined;
      let tokenToStore: string | undefined;
      let appKey: Uint8Array;

      if (mode === 'local') {
        const { file, password, handle } = credentials;
        setLoginMode("local");
        setVaultFile(file);
        if (handle) {
          setVaultFileHandle(handle);
          await saveFileHandle(handle);
        }

        const arrayBuffer = await file.arrayBuffer();
        const vaultBytes = new Uint8Array(arrayBuffer);
        const decryptedVault = await openVault(password, vaultBytes);
        loadedPasswords = decryptedVault.entries.map(vaultEntryToPasswordEntry);

        lastModified = file.lastModified;

        const masterSalt = await getExtensionMasterSalt();
        const argon2Key = await deriveKey(password, masterSalt);
        appKey = await deriveHKDF(argon2Key, "guardian-extension-local-cache");

        await saveVault(appKey, decryptedVault.entries);

        if (handle) startFilePolling(handle, password, file.lastModified);
      } else {
        const { url, username, password } = credentials;
        setLoginMode("server");
        const vaultData = await loginToServer(url, username, password);
        loadedPasswords = vaultData.entries.map(vaultEntryToPasswordEntry);

        urlToStore = vaultData.serverUrl;
        if (urlToStore) setServerUrl(urlToStore);
        tokenToStore = vaultData.authToken;
        if (tokenToStore) setAuthToken(tokenToStore);
        derivedKeyToStore = vaultData.serverKey;
        if (derivedKeyToStore) setDerivedServerKey(derivedKeyToStore);

        if (!derivedKeyToStore) throw new Error("Server key missing");
        appKey = await deriveHKDF(new Uint8Array(derivedKeyToStore), "guardian-extension-local-cache");

        await saveVault(appKey, vaultData.entries);
      }

      setLocalAppKey(Array.from(appKey));
      setPasswords(loadedPasswords);
      setIsLoggedIn(true);

      await chrome.runtime.sendMessage({
        action: 'updatePasswords',
        isLoggedIn: true,
        lastModified,
        mode,
        serverUrl: urlToStore,
        authToken: tokenToStore,
        serverKey: undefined,
        derivedServerKey: derivedKeyToStore,
        localKey: Array.from(appKey),
        resetSessionTtl: mode === "server",
      });

      await chrome.runtime.sendMessage({ action: 'sessionUnlockedAfterLogin' });
    } catch (err) {
      console.error("Failed to login:", err);
      throw err;
    }
  };

  const startFilePolling = (
    handle: FileSystemFileHandle,
    _password: string,
    initialLastModified: number
  ) => {
    if (filePollIntervalRef.current) clearInterval(filePollIntervalRef.current);
    lastFileModifiedRef.current = initialLastModified;

    filePollIntervalRef.current = window.setInterval(async () => {
      try {
        const metadata = await getFileMetadata(handle);
        if (metadata.lastModified > lastFileModifiedRef.current) {
          console.log("File changed on disk");
        }
      } catch (err) {
        console.warn("Polling error", err);
      }
    }, 10000);
  };

  const handleLogout = async () => {
    if (filePollIntervalRef.current) clearInterval(filePollIntervalRef.current);
    setIsLoggedIn(false);
    setSelectedPassword(null);
    setPasswords([]);
    setServerUrl(null);
    setAuthToken(null);
    setLocalAppKey(null);
    setDerivedServerKey(null);
    setActiveTab("vault");
    await clearSession();
    await clearFileHandle();
    await deleteVault();
    await chrome.runtime.sendMessage({ action: 'clearPasswords' });
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    await handleLogout();
    setIsRefreshing(false);
  };

  const persistPasswords = async (
    newPasswords: PasswordEntry[],
    changedEntries?: PasswordEntry[],
  ) => {
    if (!localAppKey) return;
    const entries = newPasswords.map(passwordEntryToVaultEntry);
    const appKeyArray = new Uint8Array(localAppKey);
    await saveVault(appKeyArray, entries);
    await chrome.runtime.sendMessage({
      action: 'updatePasswords',
      isLoggedIn: true,
      lastModified: Date.now(),
      mode: loginMode,
      serverUrl,
      authToken,
      serverKey: undefined,
      derivedServerKey,
      localKey: localAppKey,
    });

    if (loginMode === 'server' && serverUrl && authToken && derivedServerKey) {
      const toPush = (changedEntries || newPasswords).map(passwordEntryToVaultEntry);
      try {
        await pushEntriesToServer(
          serverUrl,
          authToken,
          new Uint8Array(derivedServerKey),
          toPush,
        );
        lastLocalPushAtRef.current = Date.now();
      } catch (err) {
        console.error("Failed to push vault changes to server:", err);
        throw err;
      }
    }
  };

  const handleAddPassword = async (entry: PasswordEntry) => {
    const updated = [...passwords, entry];
    setPasswords(updated);
    setIsAddingPassword(false);
    setSelectedPassword(entry);
    await persistPasswords(updated, [entry]);
  };

  const handleEditPassword = async (entry: PasswordEntry) => {
    const updated = passwords.map((p) => (p.id === entry.id ? entry : p));
    setPasswords(updated);
    if (selectedPassword?.id === entry.id) setSelectedPassword(entry);
    setEditingEntry(null);
    await persistPasswords(updated, [entry]);
  };

  const handleDeletePassword = async (id: string) => {
    const updated = passwords.filter((p) => p.id !== id);
    setPasswords(updated);
    if (selectedPassword?.id === id) setSelectedPassword(null);

    if (loginMode === 'server' && serverUrl && authToken) {
      try {
        await deleteEntryFromServer(serverUrl, authToken, id);
        lastLocalPushAtRef.current = Date.now();
      } catch (err) {
        console.error("Failed to delete entry on server:", err);
      }
    }

    await persistPasswords(updated);
  };

  useEffect(() => {
    if (!isLoggedIn || !localAppKey) return;

    const handler = (message: any) => {
      if (message?.action !== 'vaultMutated') return;
      const appKeyArray = new Uint8Array(localAppKey);
      loadVaultFromStorage(appKeyArray)
        .then((entries) => setPasswords(entries.map(vaultEntryToPasswordEntry)))
        .catch((err) => console.warn('vaultMutated reload failed', err));
    };

    (chrome.runtime.onMessage as any).addListener(handler);
    return () => {
      (chrome.runtime.onMessage as any).removeListener(handler);
    };
  }, [isLoggedIn, localAppKey]);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'vault_updated') {
      if (Date.now() - lastLocalPushAtRef.current < 3000) return;
      console.log("[SSE] Vault updated! Refreshing...");
      if (loginMode === 'server' && serverUrl && authToken && localAppKey && derivedServerKey) {
        setIsRefreshing(true);
        syncVault(serverUrl, authToken, derivedServerKey)
          .then(async (vaultData) => {
            const loadedPasswords = vaultData.entries.map(vaultEntryToPasswordEntry);
            setPasswords(loadedPasswords);

            const appKeyArray = new Uint8Array(localAppKey);
            await saveVault(appKeyArray, vaultData.entries);

            await chrome.runtime.sendMessage({
              action: 'updatePasswords',
              isLoggedIn: true,
              lastModified: Date.now(),
              mode: 'server',
              serverUrl,
              authToken,
              serverKey: undefined,
              derivedServerKey,
              localKey: localAppKey,
            });
            setIsRefreshing(false);
          })
          .catch((err) => {
            console.error("Headless sync failed", err);
            setIsRefreshing(false);
          });
      } else {
        handleLogout();
      }
    }
  }, [lastEvent, loginMode, serverUrl, authToken, localAppKey, syncVault]);

  const categories = Array.from(
    new Set(passwords.map((p) => p.category).filter(Boolean))
  ) as string[];

  const filteredPasswords = passwords.filter((p) => {
    const matchesSearch =
      (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.website && p.website.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (isCheckingAutoUnlock) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const renderContent = () => {
    if (!isLoggedIn) {
      return (
        <Login
          onLogin={handleLogin}
          initialFile={vaultFile}
          initialHandle={vaultFileHandle}
        />
      );
    }

    if (activeTab === "settings") {
      return (
        <Settings
          theme={theme}
          onThemeChange={setTheme}
          accentColor={accentColor}
          onAccentColorChange={setAccentColor}
          clipboardClearSeconds={clipboardClearSeconds}
          onClipboardClearSecondsChange={setClipboardClearSeconds}
          revealCensorSeconds={revealCensorSeconds}
          onRevealCensorSecondsChange={setRevealCensorSeconds}
          serverSessionExpiryDays={serverSessionExpiryDays}
          onServerSessionExpiryDaysChange={setServerSessionExpiryDays}
          onLogout={handleLogout}
        />
      );
    }

    if (activeTab === "generator") {
      return <Generator />;
    }

    return (
      <div className="flex h-full w-full">
        <aside className="flex w-[250px] shrink-0 flex-col border-r border-border">
          <header className="shrink-0 border-b border-border p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/15">
                  <Lock className="h-3 w-3 text-primary" />
                </div>
                <h1 className="text-xs font-semibold tracking-tight">Guardian</h1>
              </div>
              <div className="flex items-center gap-0.5">
                {loginMode === "local" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    aria-label="Refresh"
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                    />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleLogout}
                  aria-label="Lock vault"
                >
                  <Lock className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setSelectedPassword(null);
                    setEditingEntry(null);
                    setIsAddingPassword(true);
                  }}
                  aria-label="Add password"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                aria-label="Search vault"
                className="h-8 pl-8 text-xs"
              />
            </div>

            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  aria-label="Filter by category"
                  className="mt-2 h-8 text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </header>

          <div className="scrollbar-hide flex-1 overflow-y-auto p-2">
            {filteredPasswords.length === 0 ? (
              <div className="flex h-24 items-center justify-center">
                <p className="text-[11px] text-muted-foreground">No items</p>
              </div>
            ) : (
              <PasswordGrid
                passwords={filteredPasswords}
                onCardClick={(pw) => {
                  setIsAddingPassword(false);
                  setEditingEntry(null);
                  setSelectedPassword(pw);
                }}
                onCopyUsername={(username) => navigator.clipboard.writeText(username)}
                onCopyPassword={(password) => {
                  navigator.clipboard.writeText(password);
                  if (clipboardClearSeconds > 0) {
                    setTimeout(
                      () => navigator.clipboard.writeText(""),
                      clipboardClearSeconds * 1000
                    );
                  }
                }}
                selectedId={selectedPassword?.id}
              />
            )}
          </div>
        </aside>

        <main className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {isAddingPassword ? (
              <motion.div
                key="add-password"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <PasswordPanel
                  mode="add"
                  onSubmit={handleAddPassword}
                  onCancel={() => setIsAddingPassword(false)}
                />
              </motion.div>
            ) : editingEntry ? (
              <motion.div
                key={`edit-${editingEntry.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <PasswordPanel
                  mode="edit"
                  initial={editingEntry}
                  onSubmit={handleEditPassword}
                  onCancel={() => setEditingEntry(null)}
                />
              </motion.div>
            ) : selectedPassword ? (
              <motion.div
                key={selectedPassword.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <PasswordDetail
                  password={selectedPassword}
                  onCopyUsername={() => navigator.clipboard.writeText(selectedPassword.username)}
                  onCopyPassword={() => {
                    navigator.clipboard.writeText(selectedPassword.password);
                    if (clipboardClearSeconds > 0) {
                      setTimeout(
                        () => navigator.clipboard.writeText(""),
                        clipboardClearSeconds * 1000
                      );
                    }
                  }}
                  onEdit={() => setEditingEntry(selectedPassword)}
                  onDelete={() => handleDeletePassword(selectedPassword.id)}
                  revealCensorSeconds={revealCensorSeconds}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full"
              >
                <EmptyState
                  icon={ShieldCheck}
                  title="Guardian vault"
                  description="Select an item to view its details, or add a new password."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
        <SyncIndicator isSyncing={isSyncing} lastEventTimestamp={lastEvent?.timestamp} />

        <div className="flex-1 overflow-hidden">{renderContent()}</div>

        {isLoggedIn && (
          <nav className="flex shrink-0 items-center gap-1 border-t border-border bg-card p-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "relative flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-md bg-primary/10"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <Icon className="relative h-3.5 w-3.5" />
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </TooltipProvider>
  );
}

export default App;
