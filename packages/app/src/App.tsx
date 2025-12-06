import { useState } from "react";
import "./App.css";
import type { PasswordEntry } from "./types";
import Login from "./components/Login";
import PasswordGrid from "./components/PasswordGrid";
import Settings from "./components/Settings";
import type { VaultEntry } from "../../shared/crypto";
import { loadVault, createVault } from "../../shared/crypto";
import { Filesystem, Directory } from "@capacitor/filesystem";

// Helper function to convert VaultEntry to PasswordEntry
function vaultEntryToPasswordEntry(vaultEntry: VaultEntry): PasswordEntry {
  return {
    id: vaultEntry.id,
    title: vaultEntry.name,
    username: vaultEntry.username || "",
    website: vaultEntry.url || "",
    password: vaultEntry.password,
    category: undefined,
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
    username: passwordEntry.username || undefined,
    password: passwordEntry.password,
    url: passwordEntry.website || undefined,
    notes: passwordEntry.notes || undefined,
    createdAt: new Date().toISOString(),
    lastModified: passwordEntry.lastModified || new Date().toISOString(),
  };
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [entryCreatedAtMap, setEntryCreatedAtMap] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"dark" | "half-dark" | "light">("dark");

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

  const loadPasswordsFromVault = async (vaultBytes: Uint8Array, password: string) => {
    try {
      const decryptedVault = await loadVault(password, vaultBytes);
      
      // Convert VaultEntry[] to PasswordEntry[] and preserve createdAt
      const loadedPasswords = decryptedVault.entries.map(vaultEntryToPasswordEntry);
      const createdAtMap = new Map<string, string>();
      decryptedVault.entries.forEach(entry => {
        createdAtMap.set(entry.id, entry.createdAt);
      });
      
      setEntryCreatedAtMap(createdAtMap);
      setPasswords(loadedPasswords);
    } catch (err) {
      console.error("Error loading passwords from vault:", err);
      throw err;
    }
  };

  const savePasswordsToVault = async (updatedPasswords: PasswordEntry[]) => {
    if (!vaultPath || !masterPassword) return;

    try {
      // Convert PasswordEntry[] to VaultEntry[], preserving createdAt where possible
      const vaultEntries = updatedPasswords.map(entry => {
        const vaultEntry = passwordEntryToVaultEntry(entry);
        // Preserve original createdAt if it exists
        const originalCreatedAt = entryCreatedAtMap.get(entry.id);
        if (originalCreatedAt) {
          vaultEntry.createdAt = originalCreatedAt;
        }
        return vaultEntry;
      });
      
      // Encrypt and save
      const encryptedVault = await createVault(masterPassword, vaultEntries);
      
      // Convert Uint8Array to base64 for storage
      let binaryString = '';
      for (let i = 0; i < encryptedVault.length; i++) {
        binaryString += String.fromCharCode(encryptedVault[i]);
      }
      const base64Data = btoa(binaryString);
      
      await Filesystem.writeFile({
        path: vaultPath,
        data: base64Data,
        directory: Directory.Data,
      });
      
      // Update createdAt map with any new entries
      const newCreatedAtMap = new Map(entryCreatedAtMap);
      vaultEntries.forEach(entry => {
        if (!newCreatedAtMap.has(entry.id)) {
          newCreatedAtMap.set(entry.id, entry.createdAt);
        }
      });
      setEntryCreatedAtMap(newCreatedAtMap);
    } catch (err) {
      console.error("Error saving passwords to vault:", err);
      throw err;
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setVaultPath(null);
    setMasterPassword("");
    setPasswords([]);
    setEntryCreatedAtMap(new Map());
  };

  const handleLogin = async (path: string, password: string, vaultBytes: Uint8Array) => {
    setVaultPath(path);
    setMasterPassword(password);
    
    // Load passwords from vault using the bytes directly
    try {
      await loadPasswordsFromVault(vaultBytes, password);
      setIsLoggedIn(true);
    } catch (err) {
      console.error("Failed to load vault:", err);
    }
  };

  // Login Page
  if (!isLoggedIn) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }

  // Theme classes based on theme state
  const getThemeClasses = () => {
    if (theme === "light") {
      return {
        bg: "bg-white",
        text: "text-gray-900",
        cardBg: "bg-gray-50",
        border: "border-gray-200",
        inputBg: "bg-gray-100",
        headerBg: "bg-gray-50",
        navBg: "bg-gray-50",
      };
    } else if (theme === "half-dark") {
      return {
        bg: "bg-gray-900",
        text: "text-gray-100",
        cardBg: "bg-gray-800",
        border: "border-gray-700",
        inputBg: "bg-gray-800",
        headerBg: "bg-gray-900",
        navBg: "bg-gray-900",
      };
    } else {
      // dark (default)
      return {
        bg: "bg-black",
        text: "text-white",
        cardBg: "bg-[#0a0a0a]",
        border: "border-[#1a1a1a]",
        inputBg: "bg-[#1a1a1a]",
        headerBg: "bg-[#0a0a0a]",
        navBg: "bg-[#0a0a0a]",
      };
    }
  };

  const themeClasses = getThemeClasses();

  // Main App
  return (
    <div className={`flex flex-col h-screen ${themeClasses.bg} ${themeClasses.text} overflow-hidden`}>
      {showSettings ? (
        <Settings 
          onBack={() => setShowSettings(false)} 
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
        />
      ) : (
        <>
          {/* Header with Search */}
          <header className={`${themeClasses.headerBg} border-b ${themeClasses.border} px-4 py-3 flex-shrink-0`}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search passwords..."
                className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-4 py-3 pl-12 ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all`}
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {filteredPasswords.length > 0 && (
              <p className={`text-xs ${theme === "light" ? "text-gray-600" : "text-gray-500"} mt-2 px-1`}>
                {filteredPasswords.length} {filteredPasswords.length === 1 ? 'password' : 'passwords'}
              </p>
            )}
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 pb-20">
            {filteredPasswords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  theme === "light" ? "bg-gray-200" : theme === "half-dark" ? "bg-gray-800" : "bg-[#1a1a1a]"
                }`}>
                  <svg className={`w-8 h-8 ${
                    theme === "light" ? "text-gray-500" : theme === "half-dark" ? "text-gray-500" : "text-gray-600"
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className={`text-base mb-1 ${
                  theme === "light" ? "text-gray-600" : theme === "half-dark" ? "text-gray-400" : "text-gray-400"
                }`}>
                  {searchQuery ? "No passwords found" : "No passwords yet"}
                </p>
                <p className={`text-sm ${
                  theme === "light" ? "text-gray-500" : theme === "half-dark" ? "text-gray-500" : "text-gray-500"
                }`}>
                  {searchQuery ? "Try a different search term" : "Your passwords will appear here"}
                </p>
              </div>
            ) : (
              <PasswordGrid
                passwords={filteredPasswords}
                onCopyUsername={handleCopyUsername}
                onCopyPassword={handleCopyPassword}
                onDelete={(id) => {
                  const updatedPasswords = passwords.filter(p => p.id !== id);
                  setPasswords(updatedPasswords);
                  savePasswordsToVault(updatedPasswords).catch(console.error);
                }}
                theme={theme}
              />
            )}
          </main>
        </>
      )}

      {/* Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 ${themeClasses.navBg} border-t ${themeClasses.border} px-4 py-2 flex items-center justify-around safe-area-inset-bottom z-10`}>
          <button
            onClick={() => setShowSettings(false)}
            className="flex flex-col items-center gap-1 px-4 py-2 text-yellow-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-xs">Passwords</span>
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              showSettings ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">Settings</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 px-4 py-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs">Logout</span>
          </button>
        </nav>
    </div>
  );
}

export default App;
