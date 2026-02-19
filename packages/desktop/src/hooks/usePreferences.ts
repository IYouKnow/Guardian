import { useState, useEffect, useCallback } from "react";
import { load, Store } from "@tauri-apps/plugin-store";
import { Theme, AccentColor } from "../types";


interface Preferences {
  theme: Theme;
  accentColor: AccentColor;
  viewMode: "grid" | "table";
  itemSize: "small" | "medium" | "large";
  sidebarWidth: number;
  lastVaultPath: string | null;
  clipboardClearSeconds: number;
  revealCensorSeconds: number;
  showNotifications: boolean;
  syncTheme: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  accentColor: "yellow",
  viewMode: "grid",
  itemSize: "medium",
  sidebarWidth: 288,
  lastVaultPath: null,
  clipboardClearSeconds: 10,
  revealCensorSeconds: 5,
  showNotifications: true,
  syncTheme: false,
};

let storePromise: Promise<Store> | null = null;

async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(".settings.dat");
  }
  return storePromise;
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Track actual system preference
  const [systemTheme, setSystemTheme] = useState<Exclude<Theme, "system">>("dark");

  // Track server settings (even if not applied)
  const [serverSettings, setServerSettings] = useState<Partial<Preferences> | null>(null);

  useEffect(() => {
    // Initial check
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const updateSystemTheme = () => {
      setSystemTheme(mql.matches ? "light" : "dark");
    };

    updateSystemTheme();

    // Listen for changes
    mql.addEventListener("change", updateSystemTheme);
    return () => mql.removeEventListener("change", updateSystemTheme);
  }, []);

  // Calculate the ACTIVE theme (resolved)
  const activeTheme = preferences.theme === "system" ? systemTheme : (preferences.theme as Exclude<Theme, "system">);

  // Load preferences from store on mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        const store = await getStore();
        const savedTheme = await store.get<Theme>("theme");
        const savedAccentColor = await store.get<AccentColor>("accentColor");
        const savedViewMode = await store.get<"grid" | "table">("viewMode");
        const savedItemSize = await store.get<"small" | "medium" | "large">("itemSize");
        const savedSidebarWidth = await store.get<number>("sidebarWidth");
        const savedLastVaultPath = await store.get<string | null>("lastVaultPath");
        const savedClipboardClearSeconds = await store.get<number>("clipboardClearSeconds");
        const savedRevealCensorSeconds = await store.get<number>("revealCensorSeconds");
        const savedShowNotifications = await store.get<boolean>("showNotifications");
        const savedSyncTheme = await store.get<boolean>("syncTheme");

        setPreferences({
          theme: savedTheme ?? DEFAULT_PREFERENCES.theme,
          accentColor: savedAccentColor ?? DEFAULT_PREFERENCES.accentColor,
          viewMode: savedViewMode ?? DEFAULT_PREFERENCES.viewMode,
          itemSize: savedItemSize ?? DEFAULT_PREFERENCES.itemSize,
          sidebarWidth: savedSidebarWidth ?? DEFAULT_PREFERENCES.sidebarWidth,
          lastVaultPath: savedLastVaultPath ?? DEFAULT_PREFERENCES.lastVaultPath,
          clipboardClearSeconds: savedClipboardClearSeconds ?? DEFAULT_PREFERENCES.clipboardClearSeconds,
          revealCensorSeconds: savedRevealCensorSeconds ?? DEFAULT_PREFERENCES.revealCensorSeconds,
          showNotifications: savedShowNotifications ?? DEFAULT_PREFERENCES.showNotifications,
          syncTheme: savedSyncTheme ?? DEFAULT_PREFERENCES.syncTheme,
        });
      } catch (error) {
        console.error("Failed to load preferences:", error);
        // Use defaults on error
        setPreferences(DEFAULT_PREFERENCES);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, []);

  const updatePreference = useCallback(async <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => {
    try {
      const store = await getStore();
      await store.set(key, value);
      setPreferences((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error(`Failed to save preference ${key}:`, error);
      throw error;
    }
  }, []);

  const setTheme = useCallback(
    (theme: Theme) => updatePreference("theme", theme),
    [updatePreference]
  );

  const setAccentColor = useCallback(
    (accentColor: AccentColor) => updatePreference("accentColor", accentColor),
    [updatePreference]
  );

  const setViewMode = useCallback(
    (viewMode: "grid" | "table") => updatePreference("viewMode", viewMode),
    [updatePreference]
  );

  const setItemSize = useCallback(
    (itemSize: "small" | "medium" | "large") => updatePreference("itemSize", itemSize),
    [updatePreference]
  );

  const setSidebarWidth = useCallback(
    (sidebarWidth: number) => updatePreference("sidebarWidth", sidebarWidth),
    [updatePreference]
  );

  const setLastVaultPath = useCallback(
    (lastVaultPath: string | null) => updatePreference("lastVaultPath", lastVaultPath),
    [updatePreference]
  );

  const setClipboardClearSeconds = useCallback(
    (seconds: number) => updatePreference("clipboardClearSeconds", seconds),
    [updatePreference]
  );

  const setRevealCensorSeconds = useCallback(
    (seconds: number) => updatePreference("revealCensorSeconds", seconds),
    [updatePreference]
  );

  const setShowNotifications = useCallback(
    (show: boolean) => updatePreference("showNotifications", show),
    [updatePreference]
  );

  const setSyncTheme = useCallback(
    (sync: boolean) => updatePreference("syncTheme", sync),
    [updatePreference]
  );

  // Helper to persist settings to local store
  const persistSettings = useCallback(async (settings: Partial<Preferences>) => {
    try {
      const store = await getStore();
      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) await store.set(key, value);
      }
    } catch (e) { console.error("Failed to save settings", e); }
  }, []);

  // When syncTheme or serverSettings change, apply server settings if sync is ON
  useEffect(() => {
    console.log("[usePreferences] Sync check. Enabled:", preferences.syncTheme, "ServerSettings:", serverSettings);
    if (preferences.syncTheme && serverSettings) {
      const { theme, accentColor } = serverSettings;

      let hasChanges = false;
      const updates: Partial<Preferences> = {};

      if (theme && theme !== preferences.theme) {
        console.log("[usePreferences] Theme mismatch. Local:", preferences.theme, "Server:", theme);
        updates.theme = theme;
        hasChanges = true;
      }
      if (accentColor && accentColor !== preferences.accentColor) {
        console.log("[usePreferences] Accent mismatch. Local:", preferences.accentColor, "Server:", accentColor);
        updates.accentColor = accentColor;
        hasChanges = true;
      }

      if (hasChanges) {
        console.log("[usePreferences] Applying updates:", updates);
        setPreferences(prev => ({ ...prev, ...updates }));
        persistSettings(updates);
      }
    }
  }, [preferences.syncTheme, preferences.theme, preferences.accentColor, serverSettings, persistSettings]);

  const loadFromVault = useCallback(async (vaultSettings: Partial<Preferences>) => {
    console.log("[usePreferences] loadFromVault called with:", vaultSettings);
    // 1. Always update our knowledge of what the server has
    setServerSettings(vaultSettings);

    // 2. If sync is ALREADY on (e.g. at boot), we want to apply these immediately
    // The useEffect above will handle this automatically because serverSettings changes!
    // So we don't need to do anything else here.
  }, []);

  return {
    preferences,
    activeTheme,
    isLoading,
    setTheme,
    setAccentColor,
    setViewMode,
    setItemSize,
    setSidebarWidth,
    setLastVaultPath,
    setClipboardClearSeconds,
    setRevealCensorSeconds,
    setShowNotifications,
    setSyncTheme,
    loadFromVault,
  };
}
