import { useState, useEffect, useRef } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import "./App.css";

import { getAccentColorClasses, getThemeClasses } from "./utils/accentColors";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";

import TitleBar from "./components/TitleBar";
import PasswordGrid from "./components/PasswordGrid";
import PasswordTable from "./components/PasswordTable";
import AddPasswordModal from "./components/AddPasswordModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import Settings from "./components/Settings";
import ToastContainer from "./components/ToastContainer";
import FolderModal from "./components/FolderModal";
import SearchOverlay from "./components/SearchOverlay";
import { usePreferences } from "./hooks/usePreferences";
import { useVault } from "./hooks/useVault";
import { usePasswords } from "./hooks/usePasswords";
import { useToast } from "./hooks/useToast";
import { useSSE } from "./hooks/useSSE";
import { SyncIndicator } from "@guardian/shared";
import { motion, AnimatePresence } from "framer-motion";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Theme, AccentColor, ThemeSyncMode } from "@guardian/shared";
import type { PasswordEntry } from "./types";

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [registerMode, setRegisterMode] = useState<"local" | "server">("local");
  const [showAddModal, setShowAddModal] = useState(false);
  const [folderModalParentId, setFolderModalParentId] = useState<string | null | undefined>(undefined);
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
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const debug = useRef({ step: 'init', loginCalled: false, entries: 0, loadPwCalled: false, loadPwEntries: 0, foldersLen: 0 });

  // Custom hooks
  const {
    preferences,
    activeTheme,
    isLoading: preferencesLoading,
    setTheme,
    setAccentColor,
    setViewMode,
    setItemSize,
    setSidebarWidth,
    setLastVaultPath,
    setClipboardClearSeconds,
    setRevealCensorSeconds,
    setShowNotifications,
    setThemeSyncMode,
    setMiniMode,
    setConnectionMode,
    setLastServerUrl,
    loadFromVault,
  } = usePreferences();

  const {
    isAuthenticated,
    loadVaultFile,
    saveVaultFile,
    createNewVault,
    logout: vaultLogout,
    loginToServer,
    registerOnServer,
    syncVault,
    connectionMode,
    serverUrl,
    authToken,
    username,
  } = useVault();

  const { isSyncing, lastEvent, setIsSyncing } = useSSE(serverUrl, authToken);

  const { toasts, removeToast, success, error: showError } = useToast();
  const [selectedPasswordId, setSelectedPasswordId] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
  const [passwordContextMenu, setPasswordContextMenu] = useState<{ x: number; y: number; passwordId: string; passwordTitle: string; username: string; password: string; website: string } | null>(null);
  const [areaContextMenu, setAreaContextMenu] = useState<{ x: number; y: number } | null>(null);

  const [dragPasswordId, setDragPasswordId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null | undefined>(undefined);
  const [dropIndicatorStyle, setDropIndicatorStyle] = useState<{ left: number; top: number; width: number } | null>(null);

  const [updateVersion, setUpdateVersion] = useState<string | undefined>(undefined);
  const [dismissUpdate, setDismissUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    import("@tauri-apps/api/app").then(({ getVersion }) => getVersion().then(setAppVersion)).catch(() => {});
    check().then(u => { if (u?.available) { setUpdateVersion(u.version); setDismissUpdate(false); } }).catch(() => {});
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const update = await check();
      if (update?.available) {
        await update.download();
        await update.install();
        await relaunch();
      }
    } catch {
      setUpdating(false);
    }
  };

  const handleSync = async () => {
    try {
      if (connectionMode === 'server' && !isSyncing) {
        setIsSyncing(true);
        const vaultData = await syncVault();
        loadPasswords(vaultData.entries, vaultData.folders);
        if (vaultData.settings) {
          await loadFromVault(vaultData.settings as any);
        }
          setTimeout(() => {
          setIsSyncing(false);
        }, 1500);
      }
    } catch (err) {
      console.error("Sync failed:", err);
      setIsSyncing(false);
    }
  };

  const handleThemeSyncModeChange = async (mode: ThemeSyncMode) => {
    setThemeSyncMode(mode);

    if (mode !== "off" && connectionMode === "server") {
      try {
        const vaultData = await syncVault();
        if (vaultData.settings) {
          await loadFromVault(vaultData.settings as any);
        }
      } catch (err) {
        console.error("Failed to sync theme:", err);
        showError("Failed to sync theme from server");
      }
    }
  };

  const savePrefsToServer = async (partial: { theme?: Theme; accentColor?: AccentColor }) => {
    if (connectionMode !== "server" || !serverUrl || !authToken) return;

    try {
      await fetch(`${serverUrl}/api/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          theme: partial.theme ?? preferences.theme,
          accentColor: partial.accentColor ?? preferences.accentColor,
        }),
      });
    } catch (err) {
      console.error("Failed to save preferences to server:", err);
      showError("Failed to sync appearance to server");
    }
  };

  const handleThemeChange = async (nextTheme: Theme) => {
    if (connectionMode === "server" && preferences.themeSyncMode === "follow") return;
    setTheme(nextTheme);
    if (connectionMode === "server" && preferences.themeSyncMode === "sync") {
      await savePrefsToServer({ theme: nextTheme });
    }
  };

  const handleAccentColorChange = async (nextAccent: AccentColor) => {
    if (connectionMode === "server" && preferences.themeSyncMode === "follow") return;
    setAccentColor(nextAccent);
    if (connectionMode === "server" && preferences.themeSyncMode === "sync") {
      await savePrefsToServer({ accentColor: nextAccent });
    }
  };

  // Wrap saveVaultFile to always include preferences and folders
  const handleSavePasswords = async (entries: any[]) => {
    return saveVaultFile(entries, preferences, getFolders());
  };

  const handleSaveFolders = async (folders: any[]) => {
    if (isAuthenticated) {
      await saveVaultFile(getVaultEntries(), preferences, folders);
    }
  };

  // Listen for SSE events to trigger a background sync
  const lastVaultEventTime = useRef<number>(0);
  const isBackgroundSyncing = useRef(false);
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'vault_updated') {
      const now = Date.now();
      if (now - lastVaultEventTime.current < 2000) {
        console.log('[SSE] Skipping sync - debounce vault_updated');
        return;
      }
      // Background sync - don't show syncing indicator
      if (isBackgroundSyncing.current) return;
      isBackgroundSyncing.current = true;
      
      lastVaultEventTime.current = now;
      console.log(`[SSE] Received ${lastEvent.type}. Triggering background sync...`);
      
      syncVault().then(vaultData => {
        if (vaultData.entries.length > 0) {
          loadPasswords(vaultData.entries);
        } else {
          console.warn('[SSE] Sync returned 0 entries — keeping current passwords');
        }
        if (vaultData.settings) {
          loadFromVault(vaultData.settings as any);
        }
      }).catch(err => console.error('Background sync failed:', err))
        .finally(() => { isBackgroundSyncing.current = false; });
        
    } else if (lastEvent.type === 'prefs_updated') {
      console.log('[SSE] Received prefs_updated. Fetching preferences...');
      fetch(`${serverUrl}/api/preferences`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      })
        .then(res => res.json())
        .then(data => loadFromVault(data))
        .catch(err => console.error('Failed to fetch preferences:', err));
    }
  }, [lastEvent]);

  const {
    passwords,
    filteredPasswords,
    folders,
    searchQuery,
    activeFolderId,
    setSearchQuery,
    setActiveFolderId,
    addPassword,
    updatePassword,
    deletePassword,
    loadPasswords,
    getVaultEntries,
    getFolders,
    addFolder,
    renameFolder,
    deleteFolder,
    movePassword,
    reorderPassword,
  } = usePasswords({
    onSave: handleSavePasswords,
    onSaveFolders: handleSaveFolders,
  });

  // Debounced save for preferences
  useEffect(() => {
    if (preferencesLoading || !isAuthenticated) return;

    const handler = setTimeout(() => {
      saveVaultFile(getVaultEntries(), preferences, getFolders());
    }, 1000);

    return () => clearTimeout(handler);
  }, [preferences, saveVaultFile, getVaultEntries, getFolders, preferencesLoading, isAuthenticated]);

  // Mini mode window resize
  const isMiniMode = !preferencesLoading && !isAuthenticated && !showRegister && preferences.miniMode;

  useEffect(() => {
    if (preferencesLoading) return;

    const appWindow = getCurrentWindow();
    if (isMiniMode) {
      appWindow.setSize(new LogicalSize(450, 250)).catch(() => {});
      appWindow.setMinSize(new LogicalSize(450, 250)).catch(() => {});
      appWindow.setMaxSize(new LogicalSize(450, 250)).catch(() => {});
    } else {
      appWindow.setSize(new LogicalSize(1000, 600)).catch(() => {});
      appWindow.setMinSize(new LogicalSize(600, 400)).catch(() => {});
      appWindow.setMaxSize(new LogicalSize(1600, 1200)).catch(() => {});
    }
  }, [isMiniMode, preferencesLoading]);

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

  // Close context menus on outside click
  const passwordContextRef = useRef<HTMLDivElement>(null);
  const areaContextRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (passwordContextRef.current && !passwordContextRef.current.contains(e.target as Node)) {
        setPasswordContextMenu(null);
      }
      if (areaContextRef.current && !areaContextRef.current.contains(e.target as Node)) {
        setAreaContextMenu(null);
      }
    };
    if (passwordContextMenu || areaContextMenu) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [passwordContextMenu, areaContextMenu]);

  // Pointer-based drag system
  useEffect(() => {
    if (!dragPasswordId) return;

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    const preventSelect = (e: Event) => e.preventDefault();
    document.addEventListener('selectstart', preventSelect);

    const sidebar = sidebarRef.current;
    const handlePointerMove = (e: PointerEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });

      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        if (e.clientX < sidebarRect.right && e.clientX > sidebarRect.left) {
          const elements = document.elementsFromPoint(e.clientX, e.clientY);
          const folderEl = elements.find((el) => el.hasAttribute('data-folder-id'));
          const fid = folderEl?.getAttribute('data-folder-id');
          setDragTargetFolderId(fid !== undefined ? fid : undefined);
        } else {
          setDragTargetFolderId(undefined);
        }
      }

      // Compute drop indicator position for table reorder
      const tableEl = document.querySelector('[data-table="password-table"]');
      if (tableEl) {
        const tableRect = tableEl.getBoundingClientRect();
        if (e.clientX >= tableRect.left && e.clientX <= tableRect.right) {
          const rows = tableEl.querySelectorAll('tr[data-password-id]');
          let indicatorY: number | null = null;
          for (const row of rows) {
            const rect = row.getBoundingClientRect();
            if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
              const midpoint = rect.top + rect.height / 2;
              indicatorY = e.clientY < midpoint ? rect.top : rect.bottom;
              break;
            }
          }
          if (indicatorY === null && rows.length > 0) {
            const firstRect = rows[0].getBoundingClientRect();
            if (e.clientY < firstRect.top) {
              indicatorY = firstRect.top;
            } else {
              const lastRect = rows[rows.length - 1].getBoundingClientRect();
              if (e.clientY > lastRect.bottom) {
                indicatorY = lastRect.bottom;
              }
            }
          }
          if (indicatorY !== null && dragPasswordId) {
            setDropIndicatorStyle({ left: tableRect.left, top: indicatorY, width: tableRect.width });
          } else {
            setDropIndicatorStyle(null);
          }
        } else {
          setDropIndicatorStyle(null);
        }
      } else {
        setDropIndicatorStyle(null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        if (e.clientX < sidebarRect.right && e.clientX > sidebarRect.left) {
          const elements = document.elementsFromPoint(e.clientX, e.clientY);
          const folderEl = elements.find((el) => el.hasAttribute('data-folder-id'));
          const fid = folderEl?.getAttribute('data-folder-id');
          const targetFolderId = fid === 'root' ? null : fid ?? null;
          if (dragPasswordId) {
            movePassword(dragPasswordId, targetFolderId);
          }
        }
      }

      // Table reorder drop
      const tableEl = document.querySelector('[data-table="password-table"]');
      if (tableEl && dragPasswordId) {
        const allRows = Array.from(tableEl.querySelectorAll('tr[data-password-id]'));
        const rowEls = allRows as HTMLElement[];
        let dropIndex = -1;
        for (let i = 0; i < rowEls.length; i++) {
          const rect = rowEls[i].getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const midpoint = rect.top + rect.height / 2;
            dropIndex = e.clientY < midpoint ? i : i + 1;
            break;
          }
        }
        if (dropIndex === -1 && rowEls.length > 0) {
          const firstRect = rowEls[0].getBoundingClientRect();
          dropIndex = e.clientY < firstRect.top ? 0 : rowEls.length;
        }
        if (dropIndex >= 0) {
          reorderPassword(dragPasswordId, dropIndex);
        }
      }

      setDragPasswordId(null);
      setDragPosition(null);
      setDragTargetFolderId(undefined);
      setDropIndicatorStyle(null);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('selectstart', preventSelect);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [dragPasswordId, movePassword, reorderPassword]);

  // Ctrl+F search overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchOverlay(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard reorder: Alt+Up/Down
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPasswordId || !e.altKey) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

      e.preventDefault();

      const sorted = [...passwords].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const currentIndex = sorted.findIndex(p => p.id === selectedPasswordId);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowUp' && currentIndex > 0) {
        reorderPassword(selectedPasswordId, currentIndex - 1);
      } else if (e.key === 'ArrowDown' && currentIndex < sorted.length - 1) {
        reorderPassword(selectedPasswordId, currentIndex + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPasswordId, passwords, reorderPassword]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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

    if (preferences.clipboardClearSeconds > 0) {
      setTimeout(() => {
        navigator.clipboard.writeText("");
      }, preferences.clipboardClearSeconds * 1000);
    }
  };

  const handlePasteLink = (website: string) => {
    copyToClipboard(website);
    if (preferences.clipboardClearSeconds > 0) {
      setTimeout(() => {
        navigator.clipboard.writeText("");
      }, preferences.clipboardClearSeconds * 1000);
    }
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
      if (connectionMode === "server" && serverUrl && authToken) {
        const cleanUrl = (url: string) => url.replace(/\/$/, "");
        const markerResp = await fetch(`${cleanUrl(serverUrl)}/vault/items`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify([{ id: passwordId, encrypted_blob: "", revision: 0 }]),
        });
        if (!markerResp.ok) {
          throw new Error(`Server delete marker failed (${markerResp.status})`);
        }
      }

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
  };

  const handleRegister = async (data: any) => {
    try {
      if (registerMode === "local") {
        const { vaultPath, masterPassword, theme, accentColor } = data;
        await createNewVault(vaultPath, masterPassword);
        setLastVaultPath(vaultPath);
        await setTheme(theme);
        await setAccentColor(accentColor);
        success("Vault created");
      } else {
        // Server Register
        const { url, username, password, invite_token, db_name } = data;
        await registerOnServer(url, { username, password, invite_token, db_name });
        success("Account created. Please login.");
      }
      setShowRegister(false);

    } catch (err) {
      console.error("Failed to create vault:", err);
      showError("Failed to create vault.");
    }
  };

  const handleLogin = async (mode: "local" | "server", credentials: any) => {
    try {
      debug.current.step = 'login-start';
      let vaultData;

      if (mode === "local") {
        vaultData = await loadVaultFile(credentials.path, credentials.password);
        setLastVaultPath(credentials.path);
      } else {
        vaultData = await loginToServer(credentials.url, credentials.username, credentials.password);
        const finalUrl = /^https?:\/\//i.test(credentials.url) ? credentials.url : `https://${credentials.url}`;
        setLastServerUrl(finalUrl);
      }

      debug.current.step = 'login-done';
      debug.current.loginCalled = true;
      debug.current.entries = vaultData?.entries?.length ?? -1;
      debug.current.loadPwCalled = true;
      debug.current.loadPwEntries = vaultData?.entries?.length ?? -1;
      debug.current.foldersLen = vaultData?.folders?.length ?? -1;
      loadPasswords(vaultData.entries, vaultData.folders);
      if (vaultData.settings) {
        await loadFromVault(vaultData.settings as any);
      }
    } catch (err) {
      debug.current.step = 'login-error';
      console.error("Failed to load vault:", err);
      showError(
        err instanceof Error ? err.message : "Failed to unlock vault."
      );
      throw err;
    }
  };

  const themeClasses = getThemeClasses(activeTheme);
  const accentClasses = getAccentColorClasses(preferences.accentColor, activeTheme);

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
        <Register
          mode={registerMode}
          onRegister={handleRegister}
          onBackToLogin={() => setShowRegister(false)}
          theme={activeTheme}
          accentColor={preferences.accentColor}
        />
        <ToastContainer toasts={preferences.showNotifications ? toasts : []} onRemove={removeToast} theme={preferences.theme} accentColor={preferences.accentColor} />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login
          onLogin={handleLogin}
          onRegister={(mode) => { setRegisterMode(mode); setShowRegister(true); }}
          lastVaultPath={preferences.lastVaultPath}
          lastServerUrl={preferences.lastServerUrl}
          defaultMode={preferences.connectionMode}
          onModeChange={setConnectionMode}
          theme={activeTheme}
          accentColor={preferences.accentColor}
          mini={isMiniMode}
        />
        <ToastContainer toasts={preferences.showNotifications ? toasts : []} onRemove={removeToast} theme={preferences.theme} accentColor={preferences.accentColor} />
      </>
    );
  }

  return (
    <div className={`relative flex flex-col h-screen overflow-hidden font-sans ${themeClasses.bg} ${themeClasses.text} transition-colors duration-500`}>
      <TitleBar theme={activeTheme} accentColor={preferences.accentColor} />
      <SyncIndicator isSyncing={isSyncing} variant="subtle" />

      {updateVersion && !dismissUpdate && (
        <div className={`flex items-center justify-between px-5 py-2.5 border-b ${themeClasses.border} ${themeClasses.sectionBg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${accentClasses.bgClass}`} />
            <span className={`text-xs font-medium ${themeClasses.text}`}>
              Update <span className={accentClasses.textClass}>v{updateVersion}</span> available
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpdate}
              disabled={updating}
              className={`text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-lg ${accentClasses.bgClass} ${accentClasses.onContrastClass} hover:opacity-90 transition-all disabled:opacity-50 shadow-sm`}
            >
              {updating ? "Updating..." : "Update Now"}
            </button>
            <button
              onClick={() => setDismissUpdate(true)}
              className={`opacity-40 hover:opacity-80 transition-opacity ${themeClasses.textMuted}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Modern Background Layers */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Subtle Grid/Dot Pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] transition-opacity duration-500"
            style={{
              backgroundImage: `radial-gradient(${activeTheme === 'light' ? '#000' : '#fff'} 1px, transparent 1px)`,
              backgroundSize: '24px 24px'
            }}
          />

          {/* Main Ambient Glow - Top Right */}
          <div className={`absolute top-[-25%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-[0.15] ${accentClasses.bgClass} mix-blend-screen transition-all duration-1000`} />

          {/* Secondary Glow - Bottom Left */}
          <div className={`absolute bottom-[-25%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[130px] opacity-[0.1] ${accentClasses.bgClass} mix-blend-screen transition-all duration-1000`} />

          {/* Center/Accent Highlight */}
          <div className={`absolute top-[20%] left-[30%] w-[40%] h-[40%] rounded-full blur-[160px] opacity-[0.05] ${activeTheme === 'light' ? 'bg-blue-400' : 'bg-white'} transition-all duration-1000`} />
        </div>

        <div
          ref={sidebarRef}
          style={{ width: `${preferences.sidebarWidth}px` }}
          className="flex-shrink-0 relative z-30"
        >
          <Sidebar
            folders={folders}
            activeFolderId={activeFolderId}
            onFolderChange={(id) => {
              setActiveFolderId(id);
              setShowSettings(false);
            }}
            onAddFolder={(parentId) => setFolderModalParentId(parentId)}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            dragTargetFolderId={dragTargetFolderId}
            onAddPassword={() => setShowAddModal(true)}
            onLogout={handleLogout}
            onSettings={() => setShowSettings(!showSettings)}
            showSettings={showSettings}
            theme={activeTheme}
            accentColor={preferences.accentColor}
            connectionMode={connectionMode}
            vaultName={
              connectionMode === "server"
                ? (serverUrl || "Server").replace(/^https?:\/\//, "")
                : (preferences.lastVaultPath || "Local Vault").split(/[\\/]/).pop() || "Local Vault"
            }
            username={username}
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
                    onAccentColorChange={handleAccentColorChange}
                    onThemeChange={handleThemeChange}
                    onViewModeChange={setViewMode}
                    onItemSizeChange={setItemSize}
                    clipboardClearSeconds={preferences.clipboardClearSeconds}
                    onClipboardClearSecondsChange={setClipboardClearSeconds}
                    revealCensorSeconds={preferences.revealCensorSeconds}
                    onRevealCensorSecondsChange={setRevealCensorSeconds}
                    showNotifications={preferences.showNotifications}
                    onShowNotificationsChange={setShowNotifications}
                    themeSyncMode={preferences.themeSyncMode as any}
                    onThemeSyncModeChange={handleThemeSyncModeChange}
                    onSync={handleSync}
                    miniMode={preferences.miniMode}
                    onMiniModeChange={setMiniMode}
                    connectionMode={connectionMode}
                    appVersion={appVersion}
                    updateVersion={updateVersion}
                    updating={updating}
                    onUpdate={handleUpdate}
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


                  <div className="flex-1 overflow-y-auto p-8 relative" onContextMenu={(e) => { e.preventDefault(); setAreaContextMenu({ x: e.clientX, y: e.clientY }); }}>
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
                      theme={activeTheme}
                      itemSize={preferences.itemSize}
                      accentColor={preferences.accentColor}
                      onContextMenu={(x, y, pw) => setPasswordContextMenu({ x, y, passwordId: pw.id, passwordTitle: pw.title, username: pw.username, password: pw.password, website: pw.website })}
                    />
                  ) : (
                    <PasswordTable
                      passwords={filteredPasswords}
                      onCopyUsername={handleCopyUsername}
                      onCopyPassword={handleCopyPassword}
                      onDelete={handleDeletePassword}
                      selectedId={selectedPasswordId}
                      onSelect={setSelectedPasswordId}
                      onDoubleClick={(pw) => setEditingPassword(pw)}
                      onDragStart={(passwordId, clientX, clientY) => {
                        setDragPasswordId(passwordId);
                        setDragPosition({ x: clientX, y: clientY });
                      }}
                      theme={activeTheme}
                      itemSize={preferences.itemSize}
                      accentColor={preferences.accentColor}
                      onContextMenu={(x, y, pw) => setPasswordContextMenu({ x, y, passwordId: pw.id, passwordTitle: pw.title, username: pw.username, password: pw.password, website: pw.website })}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AddPasswordModal
        isOpen={showAddModal || editingPassword !== null}
        onClose={() => { setShowAddModal(false); setEditingPassword(null); }}
        onAddPassword={handleAddPassword}
        onUpdatePassword={updatePassword}
        folders={folders}
        defaultFolderId={activeFolderId}
        existingPassword={editingPassword}
      />

      {/* Password Context Menu */}
      {/* Area Context Menu */}
      {areaContextMenu && (
        <div
          ref={areaContextRef}
          className="fixed z-[200] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1 min-w-[160px] overflow-hidden"
          style={{ left: areaContextMenu.x, top: areaContextMenu.y }}
        >
          <button
            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
            onClick={() => { setShowAddModal(true); setAreaContextMenu(null); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Entry
          </button>
        </div>
      )}

      {passwordContextMenu && (
        <div
          ref={passwordContextRef}
          className="fixed z-[200] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1 min-w-[160px] overflow-hidden"
          style={{ left: passwordContextMenu.x, top: passwordContextMenu.y }}
        >
          <button
            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
            onClick={() => { copyToClipboard(passwordContextMenu.username); setPasswordContextMenu(null); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy Username
          </button>
          {passwordContextMenu.password && (
            <button
              className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
              onClick={() => { copyToClipboard(passwordContextMenu.password); setPasswordContextMenu(null); }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Copy Password
            </button>
          )}
          <button
            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
            onClick={() => { handlePasteLink(passwordContextMenu.website || ''); setPasswordContextMenu(null); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.353a1 1 0 00-1.416-1.416L6.5 14.5" />
            </svg>
            Paste Link
          </button>
          <div className="h-px bg-[#333] my-1" />
          <button
            className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
            onClick={() => { handleDeletePassword(passwordContextMenu.passwordId); setPasswordContextMenu(null); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
          <button
            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
            onClick={() => { copyToClipboard(passwordContextMenu.password); setPasswordContextMenu(null); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Copy Password
          </button>
          <div className="h-px bg-[#333] my-1" />
          <button
            className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
            onClick={() => { handleDeletePassword(passwordContextMenu.passwordId); setPasswordContextMenu(null); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* Drag Indicator */}
      {dragPosition && dragPasswordId && (() => {
        const entry = passwords.find((p) => p.id === dragPasswordId);
        if (!entry) return null;
        const accent = getAccentColorClasses(preferences.accentColor, activeTheme);
        return (
          <div
            className="fixed z-[300] pointer-events-none flex items-center gap-4 bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 shadow-2xl shadow-black/60 whitespace-nowrap"
            style={{ left: dragPosition.x, top: dragPosition.y - 28, width: 400 }}
          >
            <div className={`w-8 h-8 rounded-lg ${accent.bgClass} flex items-center justify-center text-xs font-bold ${accent.onContrastClass} flex-shrink-0`}>
              {entry.title.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{entry.title}</div>
              <div className="text-[0.6rem] text-zinc-500 truncate">{entry.username}</div>
            </div>
            <div className="text-xs text-zinc-600">{entry.website || '—'}</div>
          </div>
        );
      })()}

      {/* Drop Indicator Line */}
      {dropIndicatorStyle && dragPasswordId && (
        <div
          className="fixed z-[300] pointer-events-none"
          style={{
            left: dropIndicatorStyle.left,
            top: dropIndicatorStyle.top,
            width: dropIndicatorStyle.width,
            height: 2,
          }}
        >
          <div className={`h-full rounded-full ${accentClasses.bgClass}`} />
        </div>
      )}

      {/* Folder Creation Modal */}
      {folderModalParentId !== undefined && (
        <FolderModal
          parentId={folderModalParentId}
          onClose={() => setFolderModalParentId(undefined)}
          onCreate={(name) => {
            addFolder(name, folderModalParentId);
            setFolderModalParentId(undefined);
          }}
          theme={activeTheme}
          accentColor={preferences.accentColor}
        />
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        passwordTitle={deleteModal.passwordTitle}
        onConfirm={confirmDeletePassword}
        onCancel={() => setDeleteModal({ isOpen: false, passwordId: null, passwordTitle: "" })}
        isDeleting={isDeleting}
      />
      <AnimatePresence>
        {showSearchOverlay && (
          <SearchOverlay
            isOpen={showSearchOverlay}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={() => { setShowSearchOverlay(false); setSearchQuery(""); }}
            passwords={passwords}
            onCopyUsername={handleCopyUsername}
            onCopyPassword={handleCopyPassword}
            theme={activeTheme}
          />
        )}
      </AnimatePresence>
      <ToastContainer toasts={toasts} onRemove={removeToast} theme={activeTheme} accentColor={preferences.accentColor} />
    </div>
  );
}

export default App;
