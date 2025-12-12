import { useState, useEffect } from "react";
import "./App.css";
import { PasswordEntry, Theme, AccentColor } from "./types";
import Login from "./components/Login";
import PasswordGrid from "./components/PasswordGrid";
import PasswordDetail from "./components/PasswordDetail";
import Settings from "./components/Settings";
import { VaultEntry, openVault } from "../../shared/crypto";
import { loadSettings, saveSettings, saveSession, loadSession, clearSession, saveVault, loadVaultFromStorage, vaultExists, type ExtensionSettings } from "./utils/storage";

// Helper function to convert VaultEntry to PasswordEntry
function vaultEntryToPasswordEntry(vaultEntry: VaultEntry): PasswordEntry {
  return {
    id: vaultEntry.id,
    title: vaultEntry.name,
    username: vaultEntry.username || "",
    website: vaultEntry.url || "",
    password: vaultEntry.password,
    category: undefined, // VaultEntry doesn't have category, can be added later
    favorite: false,
    passwordStrength: undefined,
    lastModified: vaultEntry.lastModified,
    notes: vaultEntry.notes,
    tags: undefined,
    breached: false,
  };
}

// Helper function to convert PasswordEntry to VaultEntry
function passwordEntryToVaultEntry(passwordEntry: PasswordEntry): VaultEntry {
  return {
    id: passwordEntry.id,
    name: passwordEntry.title,
    username: passwordEntry.username,
    url: passwordEntry.website,
    password: passwordEntry.password,
    lastModified: passwordEntry.lastModified || new Date().toISOString(),
    notes: passwordEntry.notes,
  };
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [vaultFile, setVaultFile] = useState<File | null>(null);
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState<PasswordEntry | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [accentColor, setAccentColor] = useState<AccentColor>("yellow");

  // Load settings and restore session on mount
  useEffect(() => {
    loadSettings()
      .then((settings) => {
        if (settings.theme) setTheme(settings.theme);
        if (settings.accentColor) setAccentColor(settings.accentColor);
      })
      .catch((err) => {
        console.warn("Failed to load settings (this is normal if storage permission is not granted):", err);
        // Continue with default settings
      });

    // Check if vault exists in browser storage - if so, user can quick unlock
    // We'll handle this in the Login component
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (isLoggedIn) {
      const settings: ExtensionSettings = { theme, accentColor };
      saveSettings(settings).catch(console.error);
    }
  }, [theme, accentColor, isLoggedIn]);

  // Sync passwords to background when passwords change
  useEffect(() => {
    if (isLoggedIn && passwords.length > 0) {
      syncPasswordsToBackground(passwords);
      
      // Also save to browser storage for persistence
      if (masterPassword) {
        const vaultEntries = passwords.map(passwordEntryToVaultEntry);
        saveVault(masterPassword, vaultEntries).catch(console.error);
      }
    }
  }, [passwords, isLoggedIn, masterPassword]);

  const filteredPasswords = passwords.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.website.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if needed
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyUsername = (username: string) => {
    copyToClipboard(username);
  };

  const handleCopyPassword = (password: string) => {
    copyToClipboard(password);
  };

  const loadPasswordsFromFile = async (file: File, password: string) => {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const vaultBytes = new Uint8Array(arrayBuffer);
      
      const decryptedVault = await openVault(password, vaultBytes);
      
      // Convert VaultEntry[] to PasswordEntry[]
      const loadedPasswords = decryptedVault.entries.map(vaultEntryToPasswordEntry);
      
      setPasswords(loadedPasswords);
    } catch (err) {
      console.error("Error loading passwords from vault:", err);
      throw err;
    }
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setVaultFile(null);
    setMasterPassword("");
    setPasswords([]);
    setShowSettings(false);
    setSelectedPassword(null);
    // Clear passwords from background script
    clearPasswordsFromBackground();
    // Clear session
    await clearSession();
  };

  // Sync passwords to background script for autofill
  const syncPasswordsToBackground = (passwordsToSync: PasswordEntry[]) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'updatePasswords',
          passwords: passwordsToSync.map(p => ({
            id: p.id,
            title: p.title,
            username: p.username,
            website: p.website,
            password: p.password,
          })),
          isLoggedIn: true,
        }).catch(console.error);
      }
    } catch (err) {
      console.error('Failed to sync passwords to background:', err);
    }
  };

  // Clear passwords from background script
  const clearPasswordsFromBackground = () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'clearPasswords',
        }).catch(console.error);
      }
    } catch (err) {
      console.error('Failed to clear passwords from background:', err);
    }
  };

  const handleLogin = async (file: File, password: string) => {
    setVaultFile(file);
    setMasterPassword(password);
    
    // Load passwords from vault
    try {
      const decryptedVault = await openVault(password, new Uint8Array(await file.arrayBuffer()));
      const loadedPasswords = decryptedVault.entries.map(vaultEntryToPasswordEntry);
      
      setPasswords(loadedPasswords);
      setIsLoggedIn(true);
      
      // Save vault to browser storage for persistence
      try {
        await saveVault(password, decryptedVault.entries);
        
        // Save session info
        await saveSession({
          vaultFileName: file.name,
          vaultFileLastModified: file.lastModified,
        });
      } catch (err) {
        console.error("Failed to save vault to storage:", err);
      }
    } catch (err) {
      console.error("Failed to load vault:", err);
      // Don't set logged in if loading fails
      throw err;
    }
  };

  // Quick unlock from browser storage
  const handleQuickUnlock = async (password: string) => {
    try {
      const vaultEntries = await loadVaultFromStorage(password);
      const loadedPasswords = vaultEntries.map(vaultEntryToPasswordEntry);
      setPasswords(loadedPasswords);
      setMasterPassword(password);
      setIsLoggedIn(true);
      
      // Sync to background
      syncPasswordsToBackground(loadedPasswords);
    } catch (err) {
      console.error("Failed to quick unlock:", err);
      throw err;
    }
  };

  // Theme classes based on theme state
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-[#fafafa]",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
        cardBg: "bg-gray-100",
        border: "border-gray-300",
        inputBg: "bg-gray-200",
        headerBg: "bg-gray-100",
        sidebarBg: "bg-gray-100",
      };
    } else if (theme === "slate") {
      return {
        bg: "bg-gray-900",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        cardBg: "bg-gray-800",
        border: "border-gray-700",
        inputBg: "bg-gray-800",
        headerBg: "bg-gray-900",
        sidebarBg: "bg-gray-900",
      };
    } else if (theme === "editor") {
      return {
        bg: "bg-[#1e1e1e]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-[#858585]",
        cardBg: "bg-[#252526]",
        border: "border-[#3e3e42]",
        inputBg: "bg-[#2a2d2e]",
        headerBg: "bg-[#2a2d2e]",
        sidebarBg: "bg-[#252526]",
      };
    } else if (theme === "violet") {
      return {
        bg: "bg-[#282a36]",
        text: "text-[#f8f8f2]",
        textSecondary: "text-[#c9a0dc]",
        cardBg: "bg-[#44475a]",
        border: "border-[#6272a4]/60",
        inputBg: "bg-[#44475a]",
        headerBg: "bg-[#44475a]",
        sidebarBg: "bg-[#282a36]",
      };
    } else {
      // dark (default)
      return {
        bg: "bg-black",
        text: "text-white",
        textSecondary: "text-gray-400",
        cardBg: "bg-[#0a0a0a]",
        border: "border-[#1a1a1a]",
        inputBg: "bg-[#1a1a1a]",
        headerBg: "bg-[#0a0a0a]",
        sidebarBg: "bg-[#0a0a0a]",
      };
    }
  };

  const themeClasses = getThemeClasses();

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="w-full h-full flex">
        <Login
          onLogin={handleLogin}
          onQuickUnlock={handleQuickUnlock}
        />
      </div>
    );
  }

  // Main App
  return (
    <div className={`flex flex-col h-full overflow-hidden ${themeClasses.bg} ${themeClasses.text}`}>
      {showSettings ? (
        <Settings
          theme={theme}
          onThemeChange={setTheme}
          accentColor={accentColor}
          onAccentColorChange={setAccentColor}
          onBack={() => setShowSettings(false)}
          onLogout={handleLogout}
        />
      ) : selectedPassword ? (
        <PasswordDetail
          password={selectedPassword}
          onCopyUsername={() => handleCopyUsername(selectedPassword.username)}
          onCopyPassword={() => handleCopyPassword(selectedPassword.password)}
          onBack={() => setSelectedPassword(null)}
          theme={theme}
          accentColor={accentColor}
        />
      ) : (
        <>
          {/* Compact Header with Search */}
          <header className={`${themeClasses.headerBg} border-b ${themeClasses.border} px-4 py-3 flex-shrink-0`}>
            <div className="flex items-center justify-between mb-2">
              <h1 className={`text-lg font-bold ${themeClasses.text}`}>Guardian</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(true)}
                  className={`p-1.5 ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors`}
                  title="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={handleLogout}
                  className={`p-1.5 ${themeClasses.textSecondary} hover:text-red-400 transition-colors`}
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search passwords..."
                className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-3 py-2 pl-9 text-sm ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all`}
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {filteredPasswords.length > 0 && (
              <p className={`text-xs ${themeClasses.textSecondary} mt-2 px-1`}>
                {filteredPasswords.length} {filteredPasswords.length === 1 ? 'password' : 'passwords'}
              </p>
            )}
          </header>

          {/* Main Content - Vertical Card Stack */}
          <main className="flex-1 overflow-y-auto p-4">
            {filteredPasswords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className={`w-16 h-16 rounded-full ${themeClasses.cardBg} flex items-center justify-center mb-4`}>
                  <svg className={`w-8 h-8 ${themeClasses.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className={`text-base mb-1 ${themeClasses.textSecondary}`}>
                  {searchQuery ? "No passwords found" : "No passwords yet"}
                </p>
                <p className={`text-sm ${themeClasses.textSecondary}`}>
                  {searchQuery ? "Try a different search term" : "Your passwords will appear here"}
                </p>
              </div>
            ) : (
              <PasswordGrid
                passwords={filteredPasswords}
                onCardClick={(password) => setSelectedPassword(password)}
                onCopyUsername={handleCopyUsername}
                onCopyPassword={handleCopyPassword}
                theme={theme}
                accentColor={accentColor}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default App;
