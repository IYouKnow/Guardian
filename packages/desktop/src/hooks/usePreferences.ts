import { useState, useEffect, useCallback } from "react";
import { load, Store } from "@tauri-apps/plugin-store";
import { Theme, AccentColor } from "../types";
import type { ThemeSyncMode } from "@guardian/shared";

export interface KeybindingOverride {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

interface Preferences {
  theme: Theme;
  accentColor: AccentColor;
  viewMode: "grid" | "table";
  itemSize: "small" | "medium" | "large";
  sidebarWidth: number;
  lastVaultPath: string | null;
  lastServerUrl: string;
  connectionMode: "local" | "server";
  clipboardClearSeconds: number;
  revealCensorSeconds: number;
  showNotifications: boolean;
  themeSyncMode: ThemeSyncMode;
  miniMode: boolean;
  customFieldTemplates: { name: string; type: string }[];
  keybinds: Record<string, KeybindingOverride>;
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  accentColor: "yellow",
  viewMode: "grid",
  itemSize: "medium",
  sidebarWidth: 288,
  lastVaultPath: null,
  lastServerUrl: "",
  connectionMode: "local",
  clipboardClearSeconds: 10,
  revealCensorSeconds: 5,
  showNotifications: true,
  themeSyncMode: "off",
  miniMode: false,
  customFieldTemplates: [],
  keybinds: {},
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
        const savedSyncTheme = await store.get<boolean>("syncTheme"); // legacy
        const savedThemeSyncMode = await store.get<ThemeSyncMode>("themeSyncMode");
        const savedMiniMode = await store.get<boolean>("miniMode");
        const savedConnectionMode = await store.get<"local" | "server">("connectionMode");
        const savedLastServerUrl = await store.get<string>("lastServerUrl");
        const savedCustomFieldTemplates = await store.get<{ name: string; type: string }[]>("customFieldTemplates");
        const savedKeybinds = await store.get<Record<string, KeybindingOverride>>("keybinds");

        const resolvedThemeSyncMode =
          savedThemeSyncMode ?? (savedSyncTheme ? "follow" : DEFAULT_PREFERENCES.themeSyncMode);

        setPreferences({
          theme: savedTheme ?? DEFAULT_PREFERENCES.theme,
          accentColor: savedAccentColor ?? DEFAULT_PREFERENCES.accentColor,
          viewMode: savedViewMode ?? DEFAULT_PREFERENCES.viewMode,
          itemSize: savedItemSize ?? DEFAULT_PREFERENCES.itemSize,
          sidebarWidth: savedSidebarWidth ?? DEFAULT_PREFERENCES.sidebarWidth,
          lastVaultPath: savedLastVaultPath ?? DEFAULT_PREFERENCES.lastVaultPath,
          lastServerUrl: savedLastServerUrl ?? DEFAULT_PREFERENCES.lastServerUrl,
          connectionMode: savedConnectionMode ?? DEFAULT_PREFERENCES.connectionMode,
          clipboardClearSeconds: savedClipboardClearSeconds ?? DEFAULT_PREFERENCES.clipboardClearSeconds,
          revealCensorSeconds: savedRevealCensorSeconds ?? DEFAULT_PREFERENCES.revealCensorSeconds,
          showNotifications: savedShowNotifications ?? DEFAULT_PREFERENCES.showNotifications,
          themeSyncMode: resolvedThemeSyncMode,
          miniMode: savedMiniMode ?? DEFAULT_PREFERENCES.miniMode,
          customFieldTemplates: savedCustomFieldTemplates ?? DEFAULT_PREFERENCES.customFieldTemplates,
          keybinds: savedKeybinds ?? DEFAULT_PREFERENCES.keybinds,
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

  const setThemeSyncMode = useCallback(
    (mode: ThemeSyncMode) => updatePreference("themeSyncMode", mode),
    [updatePreference]
  );

  const setMiniMode = useCallback(
    (enabled: boolean) => updatePreference("miniMode", enabled),
    [updatePreference]
  );

  const setCustomFieldTemplates = useCallback(
    (templates: { name: string; type: string }[]) => updatePreference("customFieldTemplates", templates),
    [updatePreference]
  );

  const setKeybinds = useCallback(
    (keybinds: Record<string, KeybindingOverride>) => updatePreference("keybinds", keybinds),
    [updatePreference]
  );

  const setConnectionMode = useCallback(
    (mode: "local" | "server") => updatePreference("connectionMode", mode),
    [updatePreference]
  );

  const setLastServerUrl = useCallback(
    (url: string) => updatePreference("lastServerUrl", url),
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

  // When server settings change, apply them if theme sync is enabled.
  useEffect(() => {
    if (!serverSettings || preferences.themeSyncMode === "off") return;

    const { theme, accentColor } = serverSettings;
    const hasThemeChange = theme && theme !== preferences.theme;
    const hasAccentChange = accentColor && accentColor !== preferences.accentColor;

    if (!hasThemeChange && !hasAccentChange) return;

    console.log("[usePreferences] Sync check. Mode:", preferences.themeSyncMode, "ServerSettings:", serverSettings);
    if (hasThemeChange) {
      console.log("[usePreferences] Theme mismatch. Local:", preferences.theme, "Server:", theme);
    }
    if (hasAccentChange) {
      console.log("[usePreferences] Accent mismatch. Local:", preferences.accentColor, "Server:", accentColor);
    }

    const updates: Partial<Preferences> = {};
    if (hasThemeChange) updates.theme = theme;
    if (hasAccentChange) updates.accentColor = accentColor;

    console.log("[usePreferences] Applying updates:", updates);
    setPreferences(prev => ({ ...prev, ...updates }));
    persistSettings(updates);
  }, [serverSettings, preferences.themeSyncMode, preferences.theme, preferences.accentColor, persistSettings]);

  const loadFromVault = useCallback(async (vaultSettings: Partial<Preferences>) => {
    console.log("[usePreferences] loadFromVault called with:", vaultSettings);

    // Apply vault-bound settings that always travel with the vault
    const vaultBound: Partial<Preferences> = {};
    if (vaultSettings.customFieldTemplates) {
      vaultBound.customFieldTemplates = vaultSettings.customFieldTemplates;
    }
    if (vaultSettings.keybinds) {
      vaultBound.keybinds = vaultSettings.keybinds;
    }
    if (Object.keys(vaultBound).length > 0) {
      setPreferences(prev => ({ ...prev, ...vaultBound }));
      persistSettings(vaultBound);
    }

    // Update server settings for theme sync (handled by the useEffect above)
    setServerSettings(vaultSettings);
  }, [persistSettings]);

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
    setThemeSyncMode,
    setMiniMode,
    setCustomFieldTemplates,
    setKeybinds,
    setConnectionMode,
    setLastServerUrl,
    loadFromVault,
  };
}
