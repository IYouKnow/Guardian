import { useState } from "react";
import "./App.css";
import { PasswordEntry } from "./types";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import PasswordGrid from "./components/PasswordGrid";
import PasswordTable from "./components/PasswordTable";
import AddPasswordModal from "./components/AddPasswordModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import Settings from "./components/Settings";
import { VaultEntry, loadVault, createVault } from "../../shared/crypto";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";

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
  const [showRegister, setShowRegister] = useState(false);
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  // Map to preserve createdAt timestamps from vault entries
  const [entryCreatedAtMap, setEntryCreatedAtMap] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showSettings, setShowSettings] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; passwordId: string | null; passwordTitle: string }>({
    isOpen: false,
    passwordId: null,
    passwordTitle: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredPasswords = passwords.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.website.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(passwords.map((p) => p.category).filter((c): c is string => Boolean(c))))];

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
    // Note: In a real app, you'd decrypt the password here
    // For now, we'll copy the actual password value
    copyToClipboard(password);
  };

  const loadPasswordsFromVault = async (path: string, password: string) => {
    try {
      const vaultData = await readFile(path);
      const vaultBytes = vaultData instanceof Uint8Array 
        ? vaultData 
        : new Uint8Array(vaultData);
      
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
      await writeFile(vaultPath, encryptedVault);
      
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

  const handleAddPassword = async (newPassword: PasswordEntry) => {
    const updatedPasswords = [...passwords, newPassword];
    setPasswords(updatedPasswords);
    
    try {
      await savePasswordsToVault(updatedPasswords);
    } catch (err) {
      // Revert on error
      setPasswords(passwords);
      console.error("Failed to save password:", err);
      throw err;
    }
  };

  const handleDeletePassword = (id: string) => {
    const password = passwords.find(p => p.id === id);
    if (password) {
      setDeleteModal({
        isOpen: true,
        passwordId: id,
        passwordTitle: password.title,
      });
    }
  };

  const confirmDeletePassword = async () => {
    if (!deleteModal.passwordId) return;

    setIsDeleting(true);
    const passwordId = deleteModal.passwordId;
    
    try {
      const updatedPasswords = passwords.filter(p => p.id !== passwordId);
      setPasswords(updatedPasswords);
      await savePasswordsToVault(updatedPasswords);
      
      // Update createdAt map - remove deleted entry
      const newCreatedAtMap = new Map(entryCreatedAtMap);
      newCreatedAtMap.delete(passwordId);
      setEntryCreatedAtMap(newCreatedAtMap);
      
      setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" });
    } catch (err) {
      console.error("Failed to delete password:", err);
      // Revert on error - reload passwords from vault
      if (vaultPath && masterPassword) {
        await loadPasswordsFromVault(vaultPath, masterPassword);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setVaultPath(null);
    setMasterPassword("");
    setPasswords([]);
    setEntryCreatedAtMap(new Map());
    setShowSettings(false);
    setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" });
  };

  const handleRegister = (path: string, password: string) => {
    setVaultPath(path);
    setMasterPassword(password);
    // New vault starts with empty passwords array
    setPasswords([]);
    setIsLoggedIn(true);
    setShowRegister(false);
  };

  const handleLogin = async (path: string, password: string) => {
    setVaultPath(path);
    setMasterPassword(password);
    
    // Load passwords from vault
    try {
      await loadPasswordsFromVault(path, password);
      setIsLoggedIn(true);
    } catch (err) {
      console.error("Failed to load vault:", err);
      // Don't set logged in if loading fails
    }
  };

  // Register Page
  if (showRegister) {
    return (
      <Register
        onRegister={handleRegister}
        onBackToLogin={() => setShowRegister(false)}
      />
    );
  }

  // Login Page
  if (!isLoggedIn) {
    return (
      <Login
        onLogin={handleLogin}
        onRegister={() => setShowRegister(true)}
      />
    );
  }

  // Main App
  return (
    <div className="flex h-screen bg-black text-white">
      <Sidebar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={(category) => {
          setActiveCategory(category);
          setShowSettings(false); // Close settings when selecting category
        }}
        onAddPassword={() => setShowAddModal(true)}
        onLogout={handleLogout}
        onSettings={() => setShowSettings(!showSettings)}
        showSettings={showSettings}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-black">
        {showSettings ? (
          <Settings
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        ) : (
          <>
            <Header
              activeCategory={activeCategory}
              passwordCount={filteredPasswords.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <div className="flex-1 overflow-y-auto p-6">
              {filteredPasswords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-lg mb-2">
                    {searchQuery ? "No passwords found" : "No passwords yet"}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {searchQuery ? "Try a different search term" : "Add your first password to get started"}
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <PasswordGrid
                  passwords={filteredPasswords}
                  onCopyUsername={handleCopyUsername}
                  onCopyPassword={handleCopyPassword}
                  onDelete={handleDeletePassword}
                />
              ) : (
                <PasswordTable
                  passwords={filteredPasswords}
                  onCopyUsername={handleCopyUsername}
                  onCopyPassword={handleCopyPassword}
                  onDelete={handleDeletePassword}
                />
              )}
            </div>
          </>
        )}
      </main>

      <AddPasswordModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onAddPassword={handleAddPassword}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        passwordTitle={deleteModal.passwordTitle}
        onConfirm={confirmDeletePassword}
        onCancel={() => setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" })}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default App;
