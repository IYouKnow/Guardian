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
  } = usePreferences();

  const {
    vaultPath,
    isAuthenticated,
    isLoading: vaultLoading,
    loadVaultFile,
    saveVaultFile,
    createNewVault,
    logout: vaultLogout,
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
  } = usePasswords({
    onSave: saveVaultFile,
  });

  // Load last vault path on mount
  useEffect(() => {
    if (preferences.lastVaultPath && !isAuthenticated && !preferencesLoading) {
      // Optionally auto-load last vault (commented out for security)
      // User should manually login
    }
  }, [preferences.lastVaultPath, isAuthenticated, preferencesLoading]);

  // Sidebar resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const minWidth = 200;
      const maxWidth = 600;

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
      success("Password added successfully");
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add password:", err);
      showError("Failed to save password. Please try again.");
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
      success("Password deleted successfully");
      setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" });
    } catch (err) {
      console.error("Failed to delete password:", err);
      showError("Failed to delete password. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    vaultLogout();
    setShowSettings(false);
    setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" });
    setLastVaultPath(null);
    success("Logged out successfully");
  };

  const handleRegister = async (path: string, password: string) => {
    try {
      await createNewVault(path, password);
      setLastVaultPath(path);
      setShowRegister(false);
      success("Vault created successfully");
    } catch (err) {
      console.error("Failed to create vault:", err);
      showError("Failed to create vault. Please try again.");
    }
  };

  const handleLogin = async (path: string, password: string) => {
    try {
      const entries = await loadVaultFile(path, password);
      loadPasswords(entries);
      setLastVaultPath(path);
      success("Vault unlocked successfully");
    } catch (err) {
      console.error("Failed to load vault:", err);
      showError(
        err instanceof Error ? err.message : "Failed to unlock vault. Invalid password or corrupted file."
      );
    }
  };

  // Theme classes based on theme state
  const getThemeClasses = () => {
    if (preferences.theme === "light") {
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
    } else if (preferences.theme === "slate") {
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
    } else if (preferences.theme === "editor") {
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
    } else if (preferences.theme === "violet") {
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

  // Show loading state while preferences are loading
  if (preferencesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <svg
            className="animate-spin w-8 h-8 mx-auto mb-4 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Register Page
  if (showRegister) {
    return (
      <>
        <Register
          onRegister={handleRegister}
          onBackToLogin={() => setShowRegister(false)}
        />
        <ToastContainer
          toasts={toasts}
          onRemove={removeToast}
          theme={preferences.theme}
          accentColor={preferences.accentColor}
        />
      </>
    );
  }

  // Login Page
  if (!isAuthenticated) {
    return (
      <>
        <Login
          onLogin={handleLogin}
          onRegister={() => setShowRegister(true)}
          lastVaultPath={preferences.lastVaultPath}
        />
        <ToastContainer
          toasts={toasts}
          onRemove={removeToast}
          theme={preferences.theme}
          accentColor={preferences.accentColor}
        />
      </>
    );
  }

  // Main App
  return (
    <div
      className={`flex h-screen overflow-hidden ${themeClasses.bg} ${themeClasses.text}`}
    >
      <div
        ref={sidebarRef}
        style={{ width: `${preferences.sidebarWidth}px` }}
        className="flex-shrink-0 relative"
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
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          className={`absolute top-0 right-0 h-full cursor-col-resize z-10 group ${
            isResizing ? getAccentColorClasses(preferences.accentColor).lightClass : ""
          }`}
          style={{ width: "4px", marginRight: "-2px" }}
        >
          <div
            className={`absolute top-0 right-1/2 h-full w-0.5 transition-all ${
              isResizing
                ? getAccentColorClasses(preferences.accentColor).bgClass
                : `bg-transparent ${getAccentColorClasses(preferences.accentColor).hoverBgLightClass}`
            }`}
          />
        </div>
      </div>

      <main
        className={`flex-1 flex flex-col overflow-hidden min-w-0 ${themeClasses.bg}`}
      >
        {showSettings ? (
          <Settings
            viewMode={preferences.viewMode}
            onViewModeChange={setViewMode}
            theme={preferences.theme}
            onThemeChange={setTheme}
            itemSize={preferences.itemSize}
            onItemSizeChange={setItemSize}
            accentColor={preferences.accentColor}
            onAccentColorChange={setAccentColor}
          />
        ) : (
          <>
            <Header
              activeCategory={activeCategory}
              passwordCount={filteredPasswords.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              theme={preferences.theme}
              accentColor={preferences.accentColor}
            />

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
              {filteredPasswords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div
                    className={`w-20 h-20 rounded-full ${themeClasses.cardBg} flex items-center justify-center mb-6`}
                  >
                    <svg
                      className={`w-10 h-10 ${themeClasses.textSecondary}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <p className={`${themeClasses.textSecondary} text-lg mb-2`}>
                    {searchQuery ? "No passwords found" : "No passwords yet"}
                  </p>
                  <p className={`${themeClasses.textSecondary} text-sm`}>
                    {searchQuery
                      ? "Try a different search term"
                      : "Add your first password to get started"}
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
        onCancel={() =>
          setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" })
        }
        isDeleting={isDeleting}
      />

      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        theme={preferences.theme}
        accentColor={preferences.accentColor}
      />
    </div>
  );
}

export default App;
