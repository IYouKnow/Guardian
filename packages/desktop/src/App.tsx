import { useState, useEffect, useRef } from "react";
import "./App.css";
import { Theme, AccentColor } from "./types";
import { getAccentColorClasses } from "./utils/accentColors";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import PasswordGrid from "./components/PasswordGrid";
import PasswordTable from "./components/PasswordTable";
import AddPasswordModal from "./components/AddPasswordModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import Settings from "./components/Settings";
import ToastContainer from "./components/ToastContainer";
import { usePreferences } from "./hooks/usePreferences";
import { useVault } from "./hooks/useVault";
import { usePasswords } from "./hooks/usePasswords";
import { useToast } from "./hooks/useToast";
import { motion, AnimatePresence } from "framer-motion";

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    passwordId: string | null;
    passwordTitle: string;
  }>({
    isOpen: false,
    passwordId: null,
    passwordTitle: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const {
    preferences,
    isLoading: preferencesLoading,
    setTheme,
    setAccentColor,
    setViewMode,
    setItemSize,
    setSidebarWidth,
    setLastVaultPath,
    loadFromVault,
  } = usePreferences();

  const {
    isAuthenticated,
    loadVaultFile,
    saveVaultFile,
    createNewVault,
    logout: vaultLogout,
    loginToServer
  } = useVault();

  const { toasts, removeToast, success, error: showError } = useToast();

  const {
    passwords,
    filteredPasswords,
    categories,
    searchQuery,
    activeCategory,
    setSearchQuery,
    setActiveCategory,
    addPassword,
    deletePassword,
    loadPasswords,
    getVaultEntries,
  } = usePasswords({
    onSave: saveVaultFile,
  });

  // Sidebar resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const minWidth = 200;
      const maxWidth = 500;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      showError("Failed to copy to clipboard");
    }
  };

  const handleCopyUsername = (username: string) => {
    copyToClipboard(username);
  };

  const handleCopyPassword = (password: string) => {
    copyToClipboard(password);
  };

  const handleAddPassword = async (newPassword: any) => {
    try {
      await addPassword(newPassword);
      success("Record added successfully");
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add password:", err);
      showError("Failed to save record. Please try again.");
      throw err;
    }
  };

  const handleDeletePassword = (id: string) => {
    const password = passwords.find((p) => p.id === id);
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
      await deletePassword(passwordId);
      success("Record removed");
      setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" });
    } catch (err) {
      console.error("Failed to delete password:", err);
      showError("Failed to delete record.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    vaultLogout();
    setShowSettings(false);
    setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" });
    setLastVaultPath(null);
    success("Vault locked");
  };

  const handleRegister = async (path: string, password: string, theme: Theme, accentColor: AccentColor) => {
    try {
      await createNewVault(path, password);
      setLastVaultPath(path);
      await setTheme(theme);
      await setAccentColor(accentColor);
      setShowRegister(false);
      success("Vault created");
    } catch (err) {
      console.error("Failed to create vault:", err);
      showError("Failed to create vault.");
    }
  };

  const handleLogin = async (mode: "local" | "server", credentials: any) => {
    try {
      let vaultData;

      if (mode === "local") {
        vaultData = await loadVaultFile(credentials.path, credentials.password);
        setLastVaultPath(credentials.path);
      } else {
        vaultData = await loginToServer(credentials.url, credentials.username, credentials.password);
        // Maybe save server URL to preferences?
      }

      loadPasswords(vaultData.entries);
      if (vaultData.settings) {
        await loadFromVault(vaultData.settings as any);
      }
      success(mode === "server" ? "Connected to Server" : "Vault unlocked");
    } catch (err) {
      console.error("Failed to load vault:", err);
      showError(
        err instanceof Error ? err.message : "Failed to unlock vault."
      );
    }
  };

  const getThemeClasses = () => {

    switch (preferences.theme) {
      case "light":
        return {
          bg: "bg-[#f8fafc]",
          text: "text-slate-900",
          textMuted: "text-slate-500",
          border: "border-slate-200",
        };
      case "slate":
        return {
          bg: "bg-slate-950",
          text: "text-slate-100",
          textMuted: "text-slate-400",
          border: "border-slate-800",
        };
      case "editor":
        return {
          bg: "bg-[#0d0d0d]",
          text: "text-[#d4d4d4]",
          textMuted: "text-[#858585]",
          border: "border-[#333333]",
        };
      case "violet":
        return {
          bg: "bg-[#120a1f]",
          text: "text-[#f8f8f2]",
          textMuted: "text-[#c9a0dc]/70",
          border: "border-[#4a3a6b]",
        };
      default: // dark
        return {
          bg: "bg-black",
          text: "text-white",
          textMuted: "text-zinc-500",
          border: "border-zinc-800/50",
        };
    }
  };

  const themeClasses = getThemeClasses();
  const accentClasses = getAccentColorClasses(preferences.accentColor);

  if (preferencesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-zinc-500">Initializing Vault</p>
        </div>
      </div>
    );
  }

  if (showRegister) {
    return (
      <>
        <Register onRegister={handleRegister} onBackToLogin={() => setShowRegister(false)} />
        <ToastContainer toasts={toasts} onRemove={removeToast} theme={preferences.theme} accentColor={preferences.accentColor} />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} onRegister={() => setShowRegister(true)} lastVaultPath={preferences.lastVaultPath} theme={preferences.theme} accentColor={preferences.accentColor} />
        <ToastContainer toasts={toasts} onRemove={removeToast} theme={preferences.theme} accentColor={preferences.accentColor} />
      </>
    );
  }

  return (
    <div className={`relative flex h-screen overflow-hidden font-sans ${themeClasses.bg} ${themeClasses.text} transition-colors duration-500`}>
      {/* Global Background Elements */}
      <div className={`absolute top-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-10 ${accentClasses.bgClass} pointer-events-none transition-colors duration-700`} />
      <div className={`absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-5 ${accentClasses.bgClass} pointer-events-none transition-colors duration-700`} />

      <div
        ref={sidebarRef}
        style={{ width: `${preferences.sidebarWidth}px` }}
        className="flex-shrink-0 relative z-30"
      >
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={(category) => {
            setActiveCategory(category);
            setShowSettings(false);
          }}
          onAddPassword={() => setShowAddModal(true)}
          onLogout={handleLogout}
          onSettings={() => setShowSettings(!showSettings)}
          showSettings={showSettings}
          theme={preferences.theme}
          accentColor={preferences.accentColor}
        />

        {/* Resize handle */}
        <div
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
          className={`absolute top-0 right-0 h-full cursor-col-resize z-40 transition-all ${isResizing ? "bg-white/10" : "bg-transparent hover:bg-white/5"}`}
          style={{ width: "2px" }}
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-20">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-y-auto"
            >
              <Settings
                viewMode={preferences.viewMode}
                theme={preferences.theme}
                itemSize={preferences.itemSize}
                accentColor={preferences.accentColor}
                onAccentColorChange={(color) => {
                  setAccentColor(color);
                  saveVaultFile(getVaultEntries(), { ...preferences, accentColor: color });
                }}
                onThemeChange={(theme) => {
                  setTheme(theme);
                  saveVaultFile(getVaultEntries(), { ...preferences, theme });
                }}
                onViewModeChange={(mode) => {
                  setViewMode(mode);
                  saveVaultFile(getVaultEntries(), { ...preferences, viewMode: mode });
                }}
                onItemSizeChange={(size) => {
                  setItemSize(size);
                  saveVaultFile(getVaultEntries(), { ...preferences, itemSize: size });
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <Header
                activeCategory={activeCategory}
                passwordCount={filteredPasswords.length}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                theme={preferences.theme}
                accentColor={preferences.accentColor}
              />

              <div className="flex-1 overflow-y-auto p-8 relative">
                {filteredPasswords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20">
                    <div className={`w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-xl`}>
                      <svg className={`w-8 h-8 ${themeClasses.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className={`${themeClasses.text} text-lg font-bold mb-1`}>
                      {searchQuery ? "No matches found" : "Empty Secure Vault"}
                    </p>
                    <p className={`${themeClasses.textMuted} text-xs font-bold uppercase tracking-widest`}>
                      {searchQuery ? "Try a different search term" : "Add your first record to begin"}
                    </p>
                  </div>
                ) : preferences.viewMode === "grid" ? (
                  <PasswordGrid
                    passwords={filteredPasswords}
                    onCopyUsername={handleCopyUsername}
                    onCopyPassword={handleCopyPassword}
                    onDelete={handleDeletePassword}
                    theme={preferences.theme}
                    itemSize={preferences.itemSize}
                    accentColor={preferences.accentColor}
                  />
                ) : (
                  <PasswordTable
                    passwords={filteredPasswords}
                    onCopyUsername={handleCopyUsername}
                    onCopyPassword={handleCopyPassword}
                    onDelete={handleDeletePassword}
                    theme={preferences.theme}
                    itemSize={preferences.itemSize}
                    accentColor={preferences.accentColor}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AddPasswordModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAddPassword={handleAddPassword} />
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        passwordTitle={deleteModal.passwordTitle}
        onConfirm={confirmDeletePassword}
        onCancel={() => setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" })}
        isDeleting={isDeleting}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} theme={preferences.theme} accentColor={preferences.accentColor} />
    </div>
  );
}

export default App;
