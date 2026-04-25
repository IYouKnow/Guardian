import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import type { PasswordEntry } from "./types";
import Login from "./components/Login";
import PasswordGrid from "./components/PasswordGrid";
import Settings from "./components/Settings";
import type { VaultEntry } from "@guardian/shared/crypto";
import { loadVault, createVault } from "@guardian/shared/crypto";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { App as CapacitorApp } from "@capacitor/app";
import { clearServerSession } from "./api/serverAuth";
import { fetchVaultFromServer, loginToServerAndFetchVault, type ServerSession } from "./api/serverAuth";
import { deleteEntryFromServer } from "./api/serverSync";
import type { VaultData } from "@guardian/shared/crypto/vault";
import { getAccentColorClasses, type AccentColor } from "@guardian/shared/themes";
import { getThemeClasses, toSharedTheme } from "./utils/theme";
import { useSSE } from "./hooks/useSSE";

// Helper function to convert VaultEntry to PasswordEntry
function vaultEntryToPasswordEntry(vaultEntry: VaultEntry): PasswordEntry {
  const legacy = vaultEntry as unknown as {
    title?: string;
    website?: string;
  };

  return {
    id: vaultEntry.id,
    title: vaultEntry.name || legacy.title || "Untitled",
    username: vaultEntry.username || "",
    website: vaultEntry.url || legacy.website || "",
    password: vaultEntry.password || "",
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

type LocalLoginCredentials = {
  vaultFileName: string;
  vaultBytes: Uint8Array;
  password: string;
};

type ServerLoginCredentials = {
  url: string;
  username: string;
  password: string;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMode, setLoginMode] = useState<"local" | "server">("local");
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [entryCreatedAtMap, setEntryCreatedAtMap] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"dark" | "half-dark" | "light">("dark");
  const [serverSession, setServerSession] = useState<ServerSession | null>(null);
  const { lastEvent } = useSSE(
    loginMode === "server" ? serverSession?.serverUrl ?? null : null,
    loginMode === "server" ? serverSession?.authToken ?? null : null,
  );

  const filteredPasswords = passwords.filter((p) => {
    const q = searchQuery.toLowerCase();
    const title = (p.title ?? "").toLowerCase();
    const username = (p.username ?? "").toLowerCase();
    const website = (p.website ?? "").toLowerCase();
    return title.includes(q) || username.includes(q) || website.includes(q);
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

  const loadPasswordsFromVaultData = (vaultData: VaultData) => {
    const loadedPasswords = vaultData.entries.map(vaultEntryToPasswordEntry);
    const createdAtMap = new Map<string, string>();
    vaultData.entries.forEach((entry) => {
      createdAtMap.set(entry.id, entry.createdAt);
    });

    setEntryCreatedAtMap(createdAtMap);
    setPasswords(loadedPasswords);
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
    setLoginMode("local");
    setVaultPath(null);
    setMasterPassword("");
    setPasswords([]);
    setEntryCreatedAtMap(new Map());
    setServerSession(null);
    clearServerSession();
  };

  const syncInFlightRef = useRef(false);
  const lastSyncAtRef = useRef(0);

  const syncFromServer = useCallback(async () => {
    if (loginMode !== "server" || !serverSession) return;
    if (syncInFlightRef.current) return;

    const now = Date.now();
    if (now - lastSyncAtRef.current < 1000) return; // debounce bursts

    syncInFlightRef.current = true;
    try {
      const vault = await fetchVaultFromServer(serverSession);
      loadPasswordsFromVaultData(vault);
      lastSyncAtRef.current = Date.now();
    } catch (err) {
      console.warn("[sync] Failed to refresh vault", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("(401)") || msg.toLowerCase().includes("401") || msg.toLowerCase().includes("unauthorized")) {
        handleLogout();
      }
    } finally {
      syncInFlightRef.current = false;
    }
  }, [loginMode, serverSession]);

  const handleLogin = async (
    mode: "local" | "server",
    credentials: LocalLoginCredentials | ServerLoginCredentials
  ): Promise<void> => {
    if (mode === "local") {
      const { vaultFileName, vaultBytes, password } = credentials as LocalLoginCredentials;

      setLoginMode("local");
      setServerSession(null);
      setVaultPath(vaultFileName);
      setMasterPassword(password);

      await loadPasswordsFromVault(vaultBytes, password);

      // Save vault to app's data directory for future use
      const fileName = vaultFileName.endsWith(".guardian") ? vaultFileName : `${vaultFileName}.guardian`;

      let binaryString = "";
      for (let i = 0; i < vaultBytes.length; i++) {
        binaryString += String.fromCharCode(vaultBytes[i]);
      }
      const base64Data = btoa(binaryString);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data,
      });

      setVaultPath(fileName);
      setIsLoggedIn(true);
      return;
    }

    const { url, username, password } = credentials as ServerLoginCredentials;

    setLoginMode("server");
    setVaultPath(null);
    setMasterPassword("");

    const { vault, session } = await loginToServerAndFetchVault(url, username, password);
    setServerSession(session);
    loadPasswordsFromVaultData(vault);
    setIsLoggedIn(true);
  };

  // Background sync (server mode): SSE-triggered + periodic polling fallback.
  useEffect(() => {
    if (!isLoggedIn || loginMode !== "server" || !serverSession) return;

    const poll = window.setInterval(() => {
      syncFromServer().catch(() => undefined);
    }, 20000);

    return () => window.clearInterval(poll);
  }, [isLoggedIn, loginMode, serverSession, syncFromServer]);

  useEffect(() => {
    if (!isLoggedIn || loginMode !== "server" || !serverSession || !lastEvent) return;
    if (lastEvent.type === "vault_updated") {
      syncFromServer().catch(() => undefined);
    }
  }, [lastEvent, isLoggedIn, loginMode, serverSession, syncFromServer]);

  // Handle Android back button
  useEffect(() => {
    if (!isLoggedIn) return;

    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      if (showSettings) {
        // If on settings page, go back to main app
        setShowSettings(false);
      } else {
        // If on main app, exit the app
        CapacitorApp.exitApp();
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [isLoggedIn, showSettings]);

  // Login Page
  if (!isLoggedIn) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }

  const themeClasses = getThemeClasses(theme);
  const accentColor: AccentColor = "yellow";
  const accentClasses = getAccentColorClasses(accentColor, toSharedTheme(theme));

  const vaultName =
    loginMode === "server"
      ? (serverSession?.serverUrl || "Server").replace(/^https?:\/\//, "")
      : (vaultPath || "Local Vault").split(/[\\/]/).pop() || "Local Vault";

  // Main App
  return (
    <div className={`flex flex-col h-screen ${themeClasses.bg} ${themeClasses.text} overflow-hidden transition-colors duration-300 relative`}>
      <div
        className={`absolute top-[-25%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[80px] opacity-10 ${accentClasses.glowClass} pointer-events-none`}
      />
      <div
        className={`absolute bottom-[-25%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[80px] opacity-[0.06] ${accentClasses.glowClass} pointer-events-none`}
      />
      {showSettings ? (
        <Settings 
          onBack={() => setShowSettings(false)} 
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
        />
      ) : (
        <>
          {/* Header */}
          <header className="px-4 pt-12 pb-4 flex-shrink-0 relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center shadow-sm shrink-0`}>
                    <svg className={`w-5 h-5 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold tracking-tight truncate">Guardian</h1>
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted} truncate mt-0.5`}>
                      {vaultName}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className={`p-2 rounded-xl border ${themeClasses.border} ${themeClasses.cardBg} ${themeClasses.textSecondary} active:scale-95 transition-all`}
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className={`mt-4 ${themeClasses.card} border ${themeClasses.border} rounded-2xl p-3 shadow-sm`}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search passwords..."
                  className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-xl px-4 py-3 pl-11 ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} ${accentClasses.focusBorderClass} transition-all`}
                />
                <svg
                  className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${themeClasses.textMuted}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl ${themeClasses.hoverBg} ${themeClasses.textSecondary} active:scale-95 transition-all`}
                    title="Clear search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className={`text-[11px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
                  {filteredPasswords.length} {filteredPasswords.length === 1 ? "item" : "items"}
                </p>
                {searchQuery && (
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${accentClasses.textClass}`}>
                    Searching
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto px-4 pb-24 relative z-10">
            {filteredPasswords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className={`w-20 h-20 rounded-3xl ${themeClasses.card} border ${themeClasses.border} flex items-center justify-center mb-6 shadow-sm`}>
                  <svg className={`w-8 h-8 ${themeClasses.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className={`${themeClasses.text} text-lg font-bold mb-1`}>
                  {searchQuery ? "No matches found" : "Empty Secure Vault"}
                </p>
                <p className={`${themeClasses.textMuted} text-[11px] font-bold uppercase tracking-widest`}>
                  {searchQuery ? "Try a different search term" : "Add your first record to begin"}
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
                  if (loginMode === "server" && serverSession) {
                    deleteEntryFromServer(serverSession.serverUrl, serverSession.authToken, id)
                      .catch(console.error);
                  } else {
                    savePasswordsToVault(updatedPasswords).catch(console.error);
                  }
                }}
                theme={theme}
              />
            )}
          </main>
        </>
      )}

      {/* Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 ${themeClasses.navBg} border-t ${themeClasses.border} px-4 py-2 flex items-center justify-around safe-area-inset-bottom z-20`}>
          <button
            onClick={() => setShowSettings(false)}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              !showSettings ? accentClasses.textClass : themeClasses.textSecondary
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-xs">Passwords</span>
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              showSettings ? accentClasses.textClass : themeClasses.textSecondary
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
            className={`flex flex-col items-center gap-1 px-4 py-2 ${themeClasses.textSecondary} active:text-red-400 transition-colors`}
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
