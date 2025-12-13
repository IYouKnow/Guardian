import { useState, useEffect, useRef } from "react";
import "./App.css";
import { PasswordEntry, Theme, AccentColor } from "./types";
import Login from "./components/Login";
import PasswordGrid from "./components/PasswordGrid";
import PasswordDetail from "./components/PasswordDetail";
import Settings from "./components/Settings";
import { VaultEntry, openVault } from "../../shared/crypto";
import { loadSettings, saveSettings, saveSession, loadSession, clearSession, saveVault, type ExtensionSettings } from "./utils/storage";
import { 
  readFileFromHandle, 
  getFileMetadata, 
  saveFileHandle,
  clearFileHandle,
  loadFileHandle,
  type FileSystemFileHandle
} from "./utils/fileSystem";

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
  const [isCheckingAutoUnlock, setIsCheckingAutoUnlock] = useState(true);
  const [vaultFile, setVaultFile] = useState<File | null>(null);
  const [vaultFileHandle, setVaultFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState<PasswordEntry | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [accentColor, setAccentColor] = useState<AccentColor>("yellow");
  const filePollIntervalRef = useRef<number | null>(null);
  const lastFileModifiedRef = useRef<number>(0);

  // Check for auto-unlock on mount
  const checkAutoUnlock = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // First, quickly check if there's anything to unlock (without showing loading)
        const quickCheck = await chrome.runtime.sendMessage({ action: 'checkAutoUnlock' });
        
        // Only show loading if we actually have something to unlock
        if (quickCheck?.canAutoUnlock) {
          setIsCheckingAutoUnlock(true);
          
          // Try multiple times with a small delay to ensure background is ready
          let attempts = 0;
          const maxAttempts = 3;
          
          const tryUnlock = async (): Promise<boolean> => {
            const response = await chrome.runtime.sendMessage({ action: 'checkAutoUnlock' });
            if (response?.canAutoUnlock) {
              // Get cached passwords from background
              const passwordResponse = await chrome.runtime.sendMessage({ action: 'getCachedPasswords' });
              if (passwordResponse?.success && passwordResponse.passwords?.length > 0) {
                // Auto-unlock: passwords are already in background memory
                setPasswords(passwordResponse.passwords);
                setIsLoggedIn(true);
                
                // Try to restore file handle if available (for polling)
                const { handle, metadata } = await loadFileHandle();
                if (handle && metadata) {
                  setVaultFileHandle(handle);
                  // Try to read file to set vaultFile state
                  try {
                    const file = await readFileFromHandle(handle);
                    setVaultFile(file);
                  } catch (err) {
                    console.warn("Could not read file from handle:", err);
                  }
                }
                return true;
              }
            }
            return false;
          };
          
          // Try immediately
          if (await tryUnlock()) {
            setIsCheckingAutoUnlock(false);
            return;
          }
          
          // Retry with delays if first attempt failed
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
            if (await tryUnlock()) {
              setIsCheckingAutoUnlock(false);
              return;
            }
            attempts++;
          }
          
          setIsCheckingAutoUnlock(false);
        } else {
          // No passwords to unlock, don't show loading
          setIsCheckingAutoUnlock(false);
        }
      }
    } catch (err) {
      console.warn("Auto-unlock check failed (this is normal if not logged in):", err);
      setIsCheckingAutoUnlock(false);
    }
  };

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

    // Check for auto-unlock
    checkAutoUnlock();

    // Cleanup polling on unmount
    return () => {
      if (filePollIntervalRef.current) {
        clearInterval(filePollIntervalRef.current);
        filePollIntervalRef.current = null;
      }
    };
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (isLoggedIn) {
      const settings: ExtensionSettings = { theme, accentColor };
      saveSettings(settings).catch(console.error);
    }
  }, [theme, accentColor, isLoggedIn]);

  // Sync passwords to background when passwords change (but not on initial login - that's handled in handleLogin)
  useEffect(() => {
    if (isLoggedIn && passwords.length > 0 && masterPassword) {
      // Only sync if passwords actually changed (not on initial load from handleLogin)
      // This prevents duplicate saves right after login
      syncPasswordsToBackground(passwords);
      
      // Also save to browser storage for persistence
      const vaultEntries = passwords.map(passwordEntryToVaultEntry);
      saveVault(masterPassword, vaultEntries).catch(console.error);
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
    setVaultFileHandle(null);
    setMasterPassword("");
    setPasswords([]);
    setShowSettings(false);
    setSelectedPassword(null);
    // Stop file polling
    if (filePollIntervalRef.current) {
      clearInterval(filePollIntervalRef.current);
      filePollIntervalRef.current = null;
    }
    // Clear passwords from background script
    clearPasswordsFromBackground();
    // Clear session and file handle
    await clearSession();
    await clearFileHandle();
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

  const handleLogin = async (file: File, password: string, handle?: FileSystemFileHandle) => {
    setVaultFile(file);
    setMasterPassword(password);
    
    // Save file handle if provided
    if (handle) {
      setVaultFileHandle(handle);
      try {
        await saveFileHandle(handle);
      } catch (err) {
        console.error("Failed to save file handle:", err);
      }
    }
    
    // Load passwords from vault
    try {
      const decryptedVault = await openVault(password, new Uint8Array(await file.arrayBuffer()));
      const loadedPasswords = decryptedVault.entries.map(vaultEntryToPasswordEntry);
      
      setPasswords(loadedPasswords);
      setIsLoggedIn(true);
      
      // Sync passwords to background IMMEDIATELY (for auto-unlock)
      syncPasswordsToBackground(loadedPasswords);
      
      // Save vault to browser storage for persistence (for auto-unlock)
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
      
      // Start file polling if we have a handle
      if (handle) {
        startFilePolling(handle, password, file.lastModified);
      }
    } catch (err) {
      console.error("Failed to load vault:", err);
      // Don't set logged in if loading fails
      throw err;
    }
  };

  // Poll file for changes (every 10 seconds)
  const startFilePolling = (
    handle: FileSystemFileHandle,
    password: string,
    initialLastModified: number
  ) => {
    // Clear any existing interval
    if (filePollIntervalRef.current) {
      clearInterval(filePollIntervalRef.current);
    }

    // Set initial last modified time
    lastFileModifiedRef.current = initialLastModified;

    filePollIntervalRef.current = window.setInterval(async () => {
      try {
        const metadata = await getFileMetadata(handle);
        
        // Check if file was modified
        if (metadata.lastModified > lastFileModifiedRef.current) {
          console.log("Vault file changed, reloading...");
          
          // Read updated file
          const updatedFile = await readFileFromHandle(handle);
          const decryptedVault = await openVault(
            password,
            new Uint8Array(await updatedFile.arrayBuffer())
          );
          const loadedPasswords = decryptedVault.entries.map(vaultEntryToPasswordEntry);
          
          // Update passwords
          setPasswords(loadedPasswords);
          setVaultFile(updatedFile);
          
          // Update last known modified time
          lastFileModifiedRef.current = metadata.lastModified;
          
          // Save to storage for auto-unlock
          await saveVault(password, decryptedVault.entries);
          
          // Sync to background
          syncPasswordsToBackground(loadedPasswords);
        }
      } catch (err) {
        console.error("Error polling file:", err);
        // Stop polling on error
        if (filePollIntervalRef.current) {
          clearInterval(filePollIntervalRef.current);
          filePollIntervalRef.current = null;
        }
      }
    }, 10000); // Poll every 10 seconds
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

  // Show loading state while checking auto-unlock
  if (isCheckingAutoUnlock) {
    return (
      <div className="flex w-full h-full bg-black text-white items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-yellow-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-400">Unlocking...</p>
        </div>
      </div>
    );
  }

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="w-full h-full flex">
        <Login
          onLogin={handleLogin}
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
