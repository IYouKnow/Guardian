import { useState, useEffect, useCallback } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { Theme, AccentColor } from "../types";

interface Preferences {
  theme: Theme;
  accentColor: AccentColor;
  viewMode: "grid" | "table";
  itemSize: "small" | "medium" | "large";
  sidebarWidth: number;
  lastVaultPath: string | null;
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  accentColor: "yellow",
  viewMode: "grid",
  itemSize: "medium",
  sidebarWidth: 288,
  lastVaultPath: null,
};

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = new Store(".settings.dat");
  }
  return storeInstance;
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

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

        setPreferences({
          theme: savedTheme ?? DEFAULT_PREFERENCES.theme,
          accentColor: savedAccentColor ?? DEFAULT_PREFERENCES.accentColor,
          viewMode: savedViewMode ?? DEFAULT_PREFERENCES.viewMode,
          itemSize: savedItemSize ?? DEFAULT_PREFERENCES.itemSize,
          sidebarWidth: savedSidebarWidth ?? DEFAULT_PREFERENCES.sidebarWidth,
          lastVaultPath: savedLastVaultPath ?? DEFAULT_PREFERENCES.lastVaultPath,
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

  return {
    preferences,
    isLoading,
    setTheme,
    setAccentColor,
    setViewMode,
    setItemSize,
    setSidebarWidth,
    setLastVaultPath,
  };
}

