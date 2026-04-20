import { useState, useEffect, useRef } from "react";
import "./App.css";
import type { PasswordEntry, Theme, AccentColor } from "./types";
import { getAccentColorClasses } from "./utils/accentColors";
import { getThemeClasses } from "./utils/theme";
import { motion, AnimatePresence } from "framer-motion";
import Login from "./components/Login";
import PasswordGrid from "./components/PasswordGrid";
import PasswordDetail from "./components/PasswordDetail";
import Settings from "./components/Settings";
import Generator from "./components/Generator";
import AddPasswordPanel from "./components/AddPasswordPanel";
import EditPasswordModal from "./components/EditPasswordModal";
import { SyncIndicator } from "./components/SyncIndicator";
import { useSSE } from "./hooks/useSSE";
import { openVault, type VaultEntry } from "../../shared/crypto/vault";
import { deriveHKDF } from "../../shared/crypto/hkdf";
import { deriveKey } from "../../shared/crypto/argon2";
import { loadSettings, saveSettings, clearSession, saveVault, deleteVault, loadVaultFromStorage, getExtensionMasterSalt } from "./utils/storage";
import {
  getFileMetadata,
  saveFileHandle,
  clearFileHandle,
  loadFileHandle
} from "./utils/fileSystem";
import { useExtensionVault } from "./hooks/useExtensionVault";
import { pushEntriesToServer, deleteEntryFromServer } from "./utils/serverSync";

// Helper function to convert VaultEntry to PasswordEntry
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

// Helper function to convert PasswordEntry back to VaultEntry for persistence
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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAutoUnlock, setIsCheckingAutoUnlock] = useState(true);

  // Local File State
  const [_vaultFile, setVaultFile] = useState<File | null>(null);
  const [_vaultFileHandle, setVaultFileHandle] = useState<FileSystemFileHandle | null>(null);

  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPassword, setSelectedPassword] = useState<PasswordEntry | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("vault");
  const [theme, setTheme] = useState<Theme>("dark");
  const [accentColor, setAccentColor] = useState<AccentColor>("yellow");
  const [clipboardClearSeconds, setClipboardClearSeconds] = useState(10);
  const [revealCensorSeconds, setRevealCensorSeconds] = useState(5);
  const [serverSessionExpiryDays, setServerSessionExpiryDays] = useState(7);
  const [loginMode, setLoginMode] = useState<"local" | "server">("local");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modal state
  const [isAddingPassword, setIsAddingPassword] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PasswordEntry | null>(null);

  const filePollIntervalRef = useRef<number | null>(null);
  const lastFileModifiedRef = useRef<number>(0);
  // Tracks the timestamp of our last successful server push so we can
  // ignore the matching `vault_updated` SSE echo that the server sends
  // back to every session for this user (including ours).
  const lastLocalPushAtRef = useRef<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Server Hook
  const { loginToServer, syncVault } = useExtensionVault();

  // SSE Sync
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [localAppKey, setLocalAppKey] = useState<number[] | null>(null);
  const [derivedServerKey, setDerivedServerKey] = useState<number[] | null>(null);
  const { isSyncing, lastEvent } = useSSE(serverUrl, authToken);

  // Initialize settings & session
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

        // 1. Get stored session from service worker
        const session = await new Promise<{ isLoggedIn: boolean; lastModified: number, mode?: 'local' | 'server', serverUrl?: string, authToken?: string, serverKey?: number[], derivedServerKey?: number[], localKey?: number[] }>((resolve) => {
          chrome.runtime.sendMessage({ action: 'getSession' }, (res) => {
            resolve(res || { isLoggedIn: false, lastModified: 0, mode: 'local' });
          });
        });

        // 2. Load file handle (for local mode preference)
        const { handle, metadata } = await loadFileHandle();
        if (handle) setVaultFileHandle(handle);
        if (metadata) {
          setVaultFile(new File([], metadata.fileName));
          lastFileModifiedRef.current = metadata.lastModified;
        }

        // 3. Auto-login check
        if (session.isLoggedIn) {
          const storedKey = session.localKey;
          if (storedKey) {
            try {
              const localAppKey = new Uint8Array(storedKey);
              const decryptedEntries = await loadVaultFromStorage(localAppKey);
              setPasswords(decryptedEntries.map(vaultEntryToPasswordEntry));
              setIsLoggedIn(true);

              if (session.mode) {
                setLoginMode(session.mode);
              }
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

  // Debounced settings save
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
          serverSessionExpiryDays
        });
      } catch (e) {
        console.error("Failed to auto-save settings", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [theme, accentColor, clipboardClearSeconds, revealCensorSeconds, serverSessionExpiryDays]);

  // Cleanup polling
  useEffect(() => {
    return () => {
      if (filePollIntervalRef.current) {
        clearInterval(filePollIntervalRef.current);
      }
    };
  }, []);

  const handleLogin = async (mode: "local" | "server", credentials: any) => {
    try {
      let loadedPasswords: PasswordEntry[] = [];
      let lastModified = Date.now();
      let derivedKeyToStore: number[] | undefined;
      let urlToStore: string | undefined;
      let tokenToStore: string | undefined;
      let localAppKey: Uint8Array;

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
        localAppKey = await deriveHKDF(argon2Key, "guardian-extension-local-cache");

        await saveVault(localAppKey, decryptedVault.entries);

        if (handle) {
          startFilePolling(handle, password, file.lastModified);
        }

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
        localAppKey = await deriveHKDF(new Uint8Array(derivedKeyToStore), "guardian-extension-local-cache");

        await saveVault(localAppKey, vaultData.entries);
      }

      setLocalAppKey(Array.from(localAppKey));
      setPasswords(loadedPasswords);
      setIsLoggedIn(true);

      await chrome.runtime.sendMessage({
        action: 'updatePasswords',
        isLoggedIn: true,
        lastModified: lastModified,
        mode: mode,
        serverUrl: urlToStore,
        authToken: tokenToStore,
        serverKey: undefined,
        derivedServerKey: derivedKeyToStore,
        localKey: Array.from(localAppKey),
        resetSessionTtl: mode === "server",
      });

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
    await new Promise(r => setTimeout(r, 500));
    await handleLogout();
    setIsRefreshing(false);
  };

  // ----- CRUD Handlers -----

  // Persist the given password list:
  //   1. Re-encrypt and save the local cache.
  //   2. Sync session state with the service worker.
  //   3. If in server mode, push the changed entries to the server.
  //
  // `changedEntries` limits the server PUT to just the rows that actually
  // changed; if omitted we push every entry (used on first login / bulk).
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
    // Update selected password if it's the one being edited
    if (selectedPassword?.id === entry.id) {
      setSelectedPassword(entry);
    }
    setShowEditModal(false);
    setEditTarget(null);
    await persistPasswords(updated, [entry]);
  };

  const handleDeletePassword = async (id: string) => {
    const updated = passwords.filter((p) => p.id !== id);
    setPasswords(updated);
    if (selectedPassword?.id === id) {
      setSelectedPassword(null);
    }

    // Delete on server first (server-mode only) so we don't leave a stale
    // row behind. If the request fails we still update the local cache —
    // the next manual sync / SSE refresh will reconcile state.
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

  // Listen for vault mutations that happen in the service worker
  // (e.g. save-on-submit from the content script) and reload the vault
  // so the popup stays in sync without a manual refresh.
  useEffect(() => {
    if (!isLoggedIn || !localAppKey) return;

    const handler = (message: any) => {
      if (message?.action !== 'vaultMutated') return;
      const appKeyArray = new Uint8Array(localAppKey);
      loadVaultFromStorage(appKeyArray)
        .then((entries) => {
          setPasswords(entries.map(vaultEntryToPasswordEntry));
        })
        .catch((err) => console.warn('vaultMutated reload failed', err));
    };

    (chrome.runtime.onMessage as any).addListener(handler);
    return () => {
      (chrome.runtime.onMessage as any).removeListener(handler);
    };
  }, [isLoggedIn, localAppKey]);

  // SSE sync
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'vault_updated') {
      // Ignore the echo of our own push: the server broadcasts to every
      // session of this user, including us. Within 3s of a local push we
      // already have the canonical state in memory.
      if (Date.now() - lastLocalPushAtRef.current < 3000) {
        return;
      }
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
              localKey: localAppKey
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

  // Derived data
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

  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor);

  if (isCheckingAutoUnlock) {
    return (
      <div className={`w-full h-full ${themeClasses.bg} flex items-center justify-center`}>
        <div className={`w-8 h-8 border-2 ${themeClasses.border} border-t-${accentColor}-400 rounded-full animate-spin`} />
      </div>
    );
  }

  // Render Logic
  const renderContent = () => {
    if (!isLoggedIn) {
      return (
        <Login
          onLogin={handleLogin}
          initialFile={_vaultFile}
          initialHandle={_vaultFileHandle}
          theme={theme}
          accentColor={accentColor}
        />
      );
    }

    // Tab: Settings
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
          onBack={() => setActiveTab("vault")}
          onLogout={handleLogout}
        />
      );
    }

    // Tab: Generator
    if (activeTab === "generator") {
      return (
        <Generator
          theme={theme}
          accentColor={accentColor}
        />
      );
    }

    // Tab: Vault — SPLIT VIEW LAYOUT
    return (
      <div className="flex bg-black/5 h-full w-full">
        {/* Left Drawer (List) */}
        <aside className={`w-[250px] flex-shrink-0 flex flex-col border-r ${themeClasses.border}`}>
          {/* Header */}
          <header className={`${themeClasses.headerBg} px-3 py-3 flex-shrink-0 border-b ${themeClasses.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-md ${accentClasses.lightClass} flex items-center justify-center border border-white/5`}>
                  <svg className={`w-3 h-3 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className={`text-xs font-bold tracking-tight ${themeClasses.text}`}>Guardian</h1>
              </div>
              <div className="flex items-center gap-1">
                {loginMode === 'local' && (
                  <button onClick={handleManualRefresh} disabled={isRefreshing} className={`p-1 rounded-md transition-all ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${themeClasses.activeText}`} title="Refresh/Logout">
                    <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
                <button onClick={handleLogout} className={`p-1 rounded-md transition-all ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${themeClasses.activeText}`} title="Lock Vault">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
                {/* Add password button */}
                <button
                  onClick={() => {
                    setSelectedPassword(null);
                    setIsAddingPassword(true);
                  }}
                  className={`p-1 rounded-md transition-all ${themeClasses.hoverBg} ${accentClasses.textClass} hover:opacity-80`}
                  title="Add Password"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Search */}
            <div className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-2.5 py-1.5 pl-8 text-[11px] ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-1 ${accentClasses.focusRingClass} transition-all duration-300`}
              />
              <svg className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 ${themeClasses.textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {/* Category filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`w-full mt-2 ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-2.5 py-1.5 text-[11px] ${themeClasses.text} focus:outline-none focus:ring-1 ${accentClasses.focusRingClass} transition-all`}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </header>

          <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-hide">
            {filteredPasswords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 text-center opacity-40 mt-10">
                <p className={`text-[10px] font-medium ${themeClasses.textSecondary}`}>No items</p>
              </div>
            ) : (
              <PasswordGrid
                passwords={filteredPasswords}
                onCardClick={(pw) => {
                  setIsAddingPassword(false);
                  setSelectedPassword(pw);
                }}
                onCopyUsername={(username) => navigator.clipboard.writeText(username)}
                onCopyPassword={(password) => {
                  navigator.clipboard.writeText(password);
                  if (clipboardClearSeconds > 0) {
                    setTimeout(() => {
                      navigator.clipboard.writeText("");
                    }, clipboardClearSeconds * 1000);
                  }
                }}
                theme={theme}
                accentColor={accentColor}
                selectedId={selectedPassword?.id}
              />
            )}
          </div>
        </aside>

        {/* Right Content (Detail) */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {isAddingPassword ? (
              <motion.div
                key="add-password"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="h-full w-full"
              >
                <AddPasswordPanel
                  onAddPassword={handleAddPassword}
                  onCancel={() => setIsAddingPassword(false)}
                  theme={theme}
                  accentColor={accentColor}
                />
              </motion.div>
            ) : selectedPassword ? (
              <motion.div
                key={selectedPassword.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="h-full w-full"
              >
                <PasswordDetail
                  password={selectedPassword}
                  onCopyUsername={() => navigator.clipboard.writeText(selectedPassword.username)}
                  onCopyPassword={() => {
                    navigator.clipboard.writeText(selectedPassword.password);
                    if (clipboardClearSeconds > 0) {
                      setTimeout(() => {
                        navigator.clipboard.writeText("");
                      }, clipboardClearSeconds * 1000);
                    }
                  }}
                  onBack={() => setSelectedPassword(null)}
                  onEdit={() => {
                    setEditTarget(selectedPassword);
                    setShowEditModal(true);
                  }}
                  onDelete={() => handleDeletePassword(selectedPassword.id)}
                  theme={theme}
                  accentColor={accentColor}
                  revealCensorSeconds={revealCensorSeconds}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`h-full w-full flex flex-col items-center justify-center text-center p-8 ${theme === 'light' ? 'bg-gray-50' : 'bg-black/20'}`}
              >
                <div className={`w-12 h-12 rounded-2xl ${accentClasses.lightClass} border border-white/5 flex items-center justify-center mb-4 shadow-lg opacity-80`}>
                  <svg className={`w-6 h-6 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className={`${themeClasses.text} text-sm font-semibold mb-1`}>Guardian Vault</p>
                <p className={`${themeClasses.textSecondary} text-[10px]`}>Select an item to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  };

  return (
    <div className={`w-full h-full ${themeClasses.bg} selection:bg-${accentColor}-400/30 overflow-hidden transition-colors duration-300 relative flex flex-col`}>
      <SyncIndicator isSyncing={isSyncing} lastEventTimestamp={lastEvent?.timestamp} />

      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      {/* Bottom Navigation Bar — only when logged in */}
      {isLoggedIn && (
        <nav className={`flex items-center justify-around border-t ${themeClasses.border} ${themeClasses.headerBg} shrink-0`}>
          {([
            {
              id: "vault" as ActiveTab,
              label: "Vault",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
            },
            {
              id: "generator" as ActiveTab,
              label: "Generator",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ),
            },
            {
              id: "settings" as ActiveTab,
              label: "Settings",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
            },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-4 transition-all ${activeTab === tab.id
                ? `${accentClasses.textClass} opacity-100`
                : `${themeClasses.textTertiary} opacity-60 hover:opacity-100`
                }`}
            >
              {tab.icon}
              <span className="text-[9px] font-semibold">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Edit Password Modal */}
      {editTarget && (
        <EditPasswordModal
          isOpen={showEditModal}
          password={editTarget}
          onClose={() => { setShowEditModal(false); setEditTarget(null); }}
          onSave={handleEditPassword}
        />
      )}
    </div>
  );
}

export default App;
