import { useState, useEffect, useRef } from "react";
import "./App.css";
import type { PasswordEntry, Theme, AccentColor } from "./types";
import { getAccentColorClasses } from "./utils/accentColors";
import { motion, AnimatePresence } from "framer-motion";
import Login from "./components/Login";
import PasswordGrid from "./components/PasswordGrid";
import PasswordDetail from "./components/PasswordDetail";
import Settings from "./components/Settings";
import { openVault, type VaultEntry } from "../../shared/crypto";
import { loadSettings, saveSettings, saveSession, loadSession, clearSession, saveVault } from "./utils/storage";
import {
  readFileFromHandle,
  getFileMetadata,
  saveFileHandle,
  clearFileHandle,
  loadFileHandle
} from "./utils/fileSystem";

// Helper function to convert VaultEntry to PasswordEntry
function vaultEntryToPasswordEntry(vaultEntry: VaultEntry): PasswordEntry {
  return {
    id: vaultEntry.id,
    title: vaultEntry.name,
    username: vaultEntry.username || "",
    password: vaultEntry.password,
    website: vaultEntry.url || "",
    notes: vaultEntry.notes || "",
    breached: false, // Breach detection not implemented yet
  };
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAutoUnlock, setIsCheckingAutoUnlock] = useState(true);
  const [_vaultFile, setVaultFile] = useState<File | null>(null);
  const [_vaultFileHandle, setVaultFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [_masterPassword, setMasterPassword] = useState<string>("");
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPassword, setSelectedPassword] = useState<PasswordEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [accentColor, setAccentColor] = useState<AccentColor>("yellow");

  const filePollIntervalRef = useRef<number | null>(null);
  const lastFileModifiedRef = useRef<number>(0);

  // Initialize settings
  useEffect(() => {
    const initApp = async () => {
      try {
        const settings = await loadSettings();
        if (settings.theme) setTheme(settings.theme as Theme);
        if (settings.accentColor) setAccentColor(settings.accentColor as AccentColor);

        // Attempt auto-unlock if we have valid session data
        const session = await loadSession();
        const { handle } = await loadFileHandle();

        if (session && handle) {
          console.log("Session found, but master password required for security");
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsCheckingAutoUnlock(false);
      }
    };

    initApp();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (filePollIntervalRef.current) {
        clearInterval(filePollIntervalRef.current);
      }
    };
  }, []);

  const handleLogin = async (file: File, password: string, handle?: FileSystemFileHandle) => {
    try {
      setMasterPassword(password);
      setVaultFile(file);
      if (handle) {
        setVaultFileHandle(handle);
        await saveFileHandle(handle);
      }

      const arrayBuffer = await file.arrayBuffer();
      const vaultBytes = new Uint8Array(arrayBuffer);
      const decryptedVault = await openVault(password, vaultBytes);
      const loadedPasswords = decryptedVault.entries.map(vaultEntryToPasswordEntry);

      setPasswords(loadedPasswords);
      setIsLoggedIn(true);

      // Save session info
      try {
        await saveVault(password, decryptedVault.entries);
        await saveSession({
          vaultFileName: file.name,
          vaultFileLastModified: file.lastModified,
        });
      } catch (err) {
        console.error("Failed to save vault to storage:", err);
      }

      if (handle) {
        startFilePolling(handle, password, file.lastModified);
      }
    } catch (err) {
      console.error("Failed to load vault:", err);
      throw err;
    }
  };

  const startFilePolling = (
    handle: FileSystemFileHandle,
    password: string,
    initialLastModified: number
  ) => {
    if (filePollIntervalRef.current) {
      clearInterval(filePollIntervalRef.current);
    }
    lastFileModifiedRef.current = initialLastModified;

    filePollIntervalRef.current = window.setInterval(async () => {
      try {
        const metadata = await getFileMetadata(handle);
        if (metadata.lastModified > lastFileModifiedRef.current) {
          console.log("Vault file changed externally, reloading...");
          const file = await readFileFromHandle(handle);
          const arrayBuffer = await file.arrayBuffer();
          const vaultBytes = new Uint8Array(arrayBuffer);
          const decryptedVault = await openVault(password, vaultBytes);
          const loadedPasswords = decryptedVault.entries.map(vaultEntryToPasswordEntry);
          setPasswords(loadedPasswords);
          lastFileModifiedRef.current = metadata.lastModified;
        }
      } catch (err) {
        console.error("File polling error:", err);
      }
    }, 10000);
  };

  const handleLogout = async () => {
    if (filePollIntervalRef.current) {
      clearInterval(filePollIntervalRef.current);
      filePollIntervalRef.current = null;
    }
    setIsLoggedIn(false);
    setSelectedPassword(null);
    setPasswords([]);
    setMasterPassword("");
    await clearSession();
    await clearFileHandle();
  };

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    const currentSettings = await loadSettings();
    await saveSettings({ ...currentSettings, theme: newTheme });
  };

  const handleAccentColorChange = async (newColor: AccentColor) => {
    setAccentColor(newColor);
    const currentSettings = await loadSettings();
    await saveSettings({ ...currentSettings, accentColor: newColor });
  };

  const handleCopyUsername = (username: string) => {
    navigator.clipboard.writeText(username);
  };

  const handleCopyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
  };

  const filteredPasswords = passwords.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.website && p.website.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(accentColor);

  function getThemeClasses() {
    if (theme === "light") {
      return {
        bg: "bg-[#fafafa]",
        headerBg: "bg-white",
        sectionBg: "bg-gray-100/50",
        border: "border-gray-200",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
        textTertiary: "text-gray-400",
        inputBg: "bg-gray-50",
        hoverBg: "hover:bg-gray-100",
        activeText: "text-gray-900",
      };
    } else if (theme === "slate") {
      return {
        bg: "bg-[#0f172a]",
        headerBg: "bg-[#1e293b]/40",
        sectionBg: "bg-[#1e293b]/50",
        border: "border-slate-800",
        text: "text-slate-100",
        textSecondary: "text-slate-400",
        textTertiary: "text-slate-500",
        inputBg: "bg-slate-900/50",
        hoverBg: "hover:bg-slate-800/50",
        activeText: "text-slate-100",
      };
    } else if (theme === "editor") {
      return {
        bg: "bg-[#1e1e1e]",
        headerBg: "bg-[#252526]/40",
        sectionBg: "bg-[#252526]/50",
        border: "border-[#333333]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-gray-300",
        textTertiary: "text-gray-400",
        inputBg: "bg-[#1e1e1e]",
        hoverBg: "hover:bg-[#2a2d2e]/70",
        activeText: "text-[#d4d4d4]",
      };
    } else if (theme === "violet") {
      return {
        bg: "bg-[#1a1b26]",
        headerBg: "bg-[#24283b]/40",
        sectionBg: "bg-[#24283b]/50",
        border: "border-[#414868]/30",
        text: "text-[#a9b1d6]",
        textSecondary: "text-gray-300",
        textTertiary: "text-gray-400",
        inputBg: "bg-[#16161e]",
        hoverBg: "hover:bg-[#414868]/30",
        activeText: "text-[#c0caf5]",
      };
    } else {
      return {
        bg: "bg-[#050505]",
        headerBg: "bg-[#0a0a0a]",
        sectionBg: "bg-[#111111]/50",
        border: "border-white/10",
        text: "text-white",
        textSecondary: "text-gray-300",
        textTertiary: "text-gray-500",
        inputBg: "bg-[#0a0a0a]",
        hoverBg: "hover:bg-white/10",
        activeText: "text-white",
      };
    }
  }

  if (isCheckingAutoUnlock) {
    return <div className="w-full h-full bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className={`w-full h-full ${themeClasses.bg} selection:bg-yellow-400/30`}>
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <Login onLogin={handleLogin} />
          </motion.div>
        ) : showSettings ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full h-full"
          >
            <Settings
              theme={theme}
              onThemeChange={handleThemeChange}
              accentColor={accentColor}
              onAccentColorChange={handleAccentColorChange}
              onBack={() => setShowSettings(false)}
              onLogout={handleLogout}
            />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full w-full overflow-hidden"
          >
            {/* Sidebar List */}
            <aside className={`w-[260px] flex flex-col shrink-0 border-r ${themeClasses.border} overflow-hidden`}>
              <header className={`${themeClasses.headerBg} px-4 py-5 flex-shrink-0 border-b ${themeClasses.border}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md bg-yellow-400/10 flex items-center justify-center border border-yellow-400/20`}>
                      <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 0 00-2-2H6a2 0 00-2 2v6a2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className={`text-sm font-bold tracking-tight ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>Guardian</h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowSettings(true)}
                      className={`p-1.5 rounded-lg transition-all duration-300 ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:${themeClasses.activeText}`}
                      title="Settings"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleLogout}
                      className={`p-1.5 rounded-lg transition-all duration-300 ${themeClasses.hoverBg} ${themeClasses.textSecondary} hover:text-red-500`}
                      title="Logout"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vault..."
                    className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-3 py-2 pl-9 text-xs ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-1 ${accentClasses.focusRingClass} transition-all duration-300`}
                  />
                  <svg
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 transition-colors duration-300 ${themeClasses.textTertiary} group-focus-within:${accentClasses.textClass}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
                {filteredPasswords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-40">
                    <p className="text-[10px] font-medium">No results</p>
                  </div>
                ) : (
                  <PasswordGrid
                    passwords={filteredPasswords}
                    onCardClick={(password) => setSelectedPassword(password)}
                    onCopyUsername={handleCopyUsername}
                    onCopyPassword={handleCopyPassword}
                    theme={theme}
                    accentColor={accentColor}
                    selectedId={selectedPassword?.id}
                  />
                )}
              </div>
            </aside>

            {/* Detail View */}
            <main className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {selectedPassword ? (
                  <motion.div
                    key={selectedPassword.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="h-full w-full"
                  >
                    <PasswordDetail
                      password={selectedPassword}
                      onCopyUsername={() => handleCopyUsername(selectedPassword.username)}
                      onCopyPassword={() => handleCopyPassword(selectedPassword.password)}
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
                    className="h-full w-full flex flex-col items-center justify-center text-center p-8 bg-black/5"
                  >
                    <div className={`w-12 h-12 rounded-full ${themeClasses.sectionBg} flex items-center justify-center mb-4 border ${themeClasses.border} shadow-sm opacity-40`}>
                      <svg className={`w-6 h-6 ${themeClasses.textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className={`text-xs font-medium ${themeClasses.textSecondary} opacity-40`}>Select a record to view details</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
