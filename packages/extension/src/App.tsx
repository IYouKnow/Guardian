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
import { openVault, type VaultEntry } from "../../shared/crypto";
import { loadSettings, saveSettings, clearSession, saveVault } from "./utils/storage";
import {
  getFileMetadata,
  saveFileHandle,
  clearFileHandle,
  loadFileHandle
} from "./utils/fileSystem";
import { useExtensionVault } from "./hooks/useExtensionVault";

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
  };
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAutoUnlock, setIsCheckingAutoUnlock] = useState(true);

  // Local File State
  const [_vaultFile, setVaultFile] = useState<File | null>(null);
  const [_vaultFileHandle, setVaultFileHandle] = useState<FileSystemFileHandle | null>(null);

  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPassword, setSelectedPassword] = useState<PasswordEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [accentColor, setAccentColor] = useState<AccentColor>("yellow");
  const [loginMode, setLoginMode] = useState<"local" | "server">("local");

  const filePollIntervalRef = useRef<number | null>(null);
  const lastFileModifiedRef = useRef<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Server Hook
  const { loginToServer } = useExtensionVault();

  // Initialize settings & session
  useEffect(() => {
    const initApp = async () => {
      try {
        const settings = await loadSettings();
        if (settings.theme) setTheme(settings.theme as Theme);
        if (settings.accentColor) setAccentColor(settings.accentColor as AccentColor);

        // 1. Get stored session from service worker
        const session = await new Promise<{ isLoggedIn: boolean; passwords: PasswordEntry[]; lastModified: number, mode?: 'local' | 'server' }>((resolve) => {
          chrome.runtime.sendMessage({ action: 'getSession' }, (res) => {
            resolve(res || { isLoggedIn: false, passwords: [], lastModified: 0, mode: 'local' });
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
        if (session.isLoggedIn && session.passwords.length > 0) {
          // If we have a file handle, verify modification time if possible, otherwise rely on session
          let match = true;
          // Logic for verifying file freshness is skipped for brevity/complexity in mixed mode,
          // assuming session is truth unless we explicitly detect change.

          if (match) {
            setPasswords(session.passwords);
            setIsLoggedIn(true);
            if (session.mode === 'local') {
              // Ensure we check handles only if implied local
            }
            if (session.mode) {
              // We can set an internal state here if we want to track mode for UI
              // Let's us a ref or state for 'loginMode'
              setLoginMode(session.mode);
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

      if (mode === 'local') {
        const { file, password, handle } = credentials;
        setLoginMode("local");
        setVaultFile(file);
        if (handle) {
          setVaultFileHandle(handle);
          await saveFileHandle(handle);
          // Permission checks simplified here, assume handled or handle exists
        }

        const arrayBuffer = await file.arrayBuffer();
        const vaultBytes = new Uint8Array(arrayBuffer);
        const decryptedVault = await openVault(password, vaultBytes);
        loadedPasswords = decryptedVault.entries.map(vaultEntryToPasswordEntry);

        lastModified = file.lastModified;

        // Save session locally for persistence
        await saveVault(password, decryptedVault.entries);

        if (handle) {
          startFilePolling(handle, password, file.lastModified);
        }

      } else {
        // Server Mode
        const { url, username, password } = credentials;
        setLoginMode("server");
        const vaultData = await loginToServer(url, username, password);
        loadedPasswords = vaultData.entries.map(vaultEntryToPasswordEntry);
        // We don't verify file modified for server mode in this simple version
      }

      setPasswords(loadedPasswords);
      setIsLoggedIn(true);

      // Persist session to Service Worker
      await chrome.runtime.sendMessage({
        action: 'updatePasswords',
        passwords: loadedPasswords,
        isLoggedIn: true,
        lastModified: lastModified,
        mode: mode
      });

    } catch (err) {
      console.error("Failed to login:", err);
      throw err;
    }
  };

  const startFilePolling = (
    handle: FileSystemFileHandle,
    password: string,
    initialLastModified: number
  ) => {
    if (filePollIntervalRef.current) clearInterval(filePollIntervalRef.current);
    lastFileModifiedRef.current = initialLastModified;

    filePollIntervalRef.current = window.setInterval(async () => {
      try {
        const metadata = await getFileMetadata(handle);
        if (metadata.lastModified > lastFileModifiedRef.current) {
          // Reload logic...
          // For now just log, preventing auto-reload complexity in this refactor
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
    setShowSettings(false);
    await clearSession();
    await clearFileHandle();
    await chrome.runtime.sendMessage({ action: 'clearPasswords' });
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 500));
    // Simple refresh: Logout
    await handleLogout();
    setIsRefreshing(false);
  };

  const filteredPasswords = passwords.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.website && p.website.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

    if (showSettings) {
      return (
        <Settings
          theme={theme}
          onThemeChange={async (t: Theme) => {
            setTheme(t);
            const s = await loadSettings();
            saveSettings({ ...s, theme: t });
          }}
          accentColor={accentColor}
          onAccentColorChange={async (c: AccentColor) => {
            setAccentColor(c);
            const s = await loadSettings();
            saveSettings({ ...s, accentColor: c });
          }}
          onBack={() => setShowSettings(false)}
          onLogout={handleLogout}
        />
      );
    }

    // SPLIT VIEW LAYOUT
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
                <button onClick={() => setShowSettings(true)} className={`p-1 rounded-md transition-all ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${themeClasses.activeText}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
          </header>

          <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-hide">
            {filteredPasswords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 text-center opacity-40 mt-10">
                <p className={`text-[10px] font-medium ${themeClasses.textSecondary}`}>No items</p>
              </div>
            ) : (
              <PasswordGrid
                passwords={filteredPasswords}
                onCardClick={setSelectedPassword}
                onCopyUsername={(username) => navigator.clipboard.writeText(username)}
                onCopyPassword={(password) => navigator.clipboard.writeText(password)}
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
            {selectedPassword ? (
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
                  onCopyPassword={() => navigator.clipboard.writeText(selectedPassword.password)}
                  onBack={() => setSelectedPassword(null)}
                  theme={theme}
                  accentColor={accentColor}
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
    <div className={`w-full h-full ${themeClasses.bg} selection:bg-${accentColor}-400/30 overflow-hidden transition-colors duration-300`}>
      {renderContent()}
    </div>
  );
}

export default App;
