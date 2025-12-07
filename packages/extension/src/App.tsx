import { useState, useEffect } from "react";
import "./App.css";
import { PasswordEntry, Theme, AccentColor } from "./types";
import { getAccentColorClasses } from "./utils/accentColors";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import PasswordGrid from "./components/PasswordGrid";
import PasswordTable from "./components/PasswordTable";
import Settings from "./components/Settings";
import { VaultEntry, openVault } from "../../shared/crypto";
import { loadSettings, saveSettings, type ExtensionSettings } from "./utils/storage";

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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [vaultFile, setVaultFile] = useState<File | null>(null);
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [accentColor, setAccentColor] = useState<AccentColor>("yellow");
  const [itemSize, setItemSize] = useState<"small" | "medium" | "large">("medium");

  // Load settings on mount
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
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (isLoggedIn) {
      const settings: ExtensionSettings = { theme, accentColor };
      saveSettings(settings).catch(console.error);
    }
  }, [theme, accentColor, isLoggedIn]);

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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setVaultFile(null);
    setMasterPassword("");
    setPasswords([]);
    setShowSettings(false);
  };

  const handleLogin = async (file: File, password: string) => {
    setVaultFile(file);
    setMasterPassword(password);
    
    // Load passwords from vault
    try {
      await loadPasswordsFromFile(file, password);
      setIsLoggedIn(true);
    } catch (err) {
      console.error("Failed to load vault:", err);
      // Don't set logged in if loading fails
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
        />
      </div>
    );
  }

  // Main App
  return (
    <div className={`flex h-full overflow-hidden ${themeClasses.bg} ${themeClasses.text}`}>
      <div className="w-72 flex-shrink-0 relative">
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={(category) => {
            setActiveCategory(category);
            setShowSettings(false); // Close settings when selecting category
          }}
          onLogout={handleLogout}
          onSettings={() => setShowSettings(!showSettings)}
          showSettings={showSettings}
          theme={theme}
          accentColor={accentColor}
        />
      </div>

      <main className={`flex-1 flex flex-col overflow-hidden min-w-0 ${themeClasses.bg}`}>
        {showSettings ? (
          <Settings
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            theme={theme}
            onThemeChange={setTheme}
            itemSize={itemSize}
            onItemSizeChange={setItemSize}
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
          />
        ) : (
          <>
            <Header
              activeCategory={activeCategory}
              passwordCount={filteredPasswords.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              theme={theme}
              accentColor={accentColor}
            />

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
              {filteredPasswords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className={`w-20 h-20 rounded-full ${themeClasses.cardBg} flex items-center justify-center mb-6`}>
                    <svg className={`w-10 h-10 ${themeClasses.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className={`${themeClasses.textSecondary} text-lg mb-2`}>
                    {searchQuery ? "No passwords found" : "No passwords yet"}
                  </p>
                  <p className={`${themeClasses.textSecondary} text-sm`}>
                    {searchQuery ? "Try a different search term" : "No passwords in this vault"}
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <PasswordGrid
                  passwords={filteredPasswords}
                  onCopyUsername={handleCopyUsername}
                  onCopyPassword={handleCopyPassword}
                  theme={theme}
                  itemSize={itemSize}
                  accentColor={accentColor}
                />
              ) : (
                <PasswordTable
                  passwords={filteredPasswords}
                  onCopyUsername={handleCopyUsername}
                  onCopyPassword={handleCopyPassword}
                  theme={theme}
                  itemSize={itemSize}
                  accentColor={accentColor}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
