import { useState } from "react";
import "./App.css";
import { PasswordEntry } from "./types";
import Login from "./components/Login";
import PasswordGrid from "./components/PasswordGrid";
import { VaultEntry, loadVault, createVault } from "../../shared/crypto";
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

  // Main App
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-[#0a0a0a] border-b border-[#1a1a1a] p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Guardian</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg transition-all"
          >
            Logout
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search passwords..."
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {filteredPasswords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg mb-2">
              {searchQuery ? "No passwords found" : "No passwords yet"}
            </p>
            <p className="text-gray-500 text-sm">
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
          />
        )}
      </main>
    </div>
  );
}

export default App;
