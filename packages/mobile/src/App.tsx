import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import type { PasswordEntry } from "./types";
import Login from "./components/Login";
import PasswordGrid from "./components/PasswordGrid";
import Settings from "./components/Settings";
import PasswordDetail from "./components/PasswordDetail";
import PasswordForm from "./components/PasswordForm";
import type { VaultEntry } from "@guardian/shared/crypto";
import { loadVault, createVault } from "@guardian/shared/crypto";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { App as CapacitorApp } from "@capacitor/app";
import { NativeBiometric, BiometryType } from "@capgo/capacitor-native-biometric";
import { clearServerSession, getStoredServerUrl, getStoredServerUsername } from "./api/serverAuth";
import { fetchPreferencesFromServer, fetchVaultFromServer, fetchVaultItemIdsFromServer, loginToServerAndFetchVault, savePreferencesToServer, type ServerSession } from "./api/serverAuth";
import { deleteEntryFromServer, deleteEntryViaUpsertToServer, pushEntriesToServer } from "./api/serverSync";
import type { VaultData, VaultSettings } from "@guardian/shared/crypto/vault";
import { getAccentColorClasses, type AccentColor, type Theme } from "@guardian/shared/themes";
import { getThemeClasses } from "./utils/theme";
import { useSSE } from "./hooks/useSSE";
import { SensitiveClipboard } from "./plugins/SensitiveClipboard";
import { AutofillBridge, type AutofillLaunchContext, type PendingAutofillFillRequest, type PendingAutofillSave } from "./plugins/AutofillBridge";

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
    favicon: vaultEntry.favicon,
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
    favicon: passwordEntry.favicon || undefined,
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

const BIOMETRIC_LOCAL_PREF_KEY = "guardian_biometric_local_enabled";
const BIOMETRIC_SERVER_PREF_KEY = "guardian_biometric_server_enabled";
const BIOMETRIC_LOCAL_SERVER_ID = "guardian-app-local-vault";
const BIOMETRIC_SERVER_PREFIX = "guardian-app-server:";
const INTERFACE_DENSITY_KEY = "guardian_interface_density";

function biometryLabel(type: BiometryType): string {
  if (type === BiometryType.FACE_ID || type === BiometryType.FACE_AUTHENTICATION) return "Face ID";
  if (type === BiometryType.FINGERPRINT || type === BiometryType.TOUCH_ID) return "Fingerprint";
  if (type === BiometryType.IRIS_AUTHENTICATION) return "Iris";
  return "biometrics";
}

function cleanUrl(input: string): string {
  return (input || "").trim().replace(/\/+$/, "");
}

function serverIdFor(url: string): string {
  return `${BIOMETRIC_SERVER_PREFIX}${cleanUrl(url)}`;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function normalizeAndroidAppWebsite(input: string): string {
  return (input || "").trim().toLowerCase().replace(/^androidapp:\/\//, "");
}

function fallbackTitleFromPackageName(packageName: string): string {
  const genericSegments = new Set([
    "app",
    "apps",
    "android",
    "mobile",
    "release",
    "debug",
    "prod",
    "production",
    "staging",
    "beta",
    "alpha",
    "dev",
    "qa",
    "pt",
    "com",
  ]);
  const segments = (packageName || "")
    .trim()
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
  const preferred =
    [...segments]
      .reverse()
      .find((part) => !genericSegments.has(part.toLowerCase()) && /[a-z]/i.test(part)) || "";
  if (!preferred) return "Saved Login";
  const spaced = preferred.replace(/[-_]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
  if (!spaced) return "Saved Login";
  const words = spaced.split(/\s+/).filter(Boolean);
  if (words.length === 1 && /^[a-z0-9]{2,5}$/i.test(words[0])) {
    return words[0].toUpperCase();
  }
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function App() {
  type ThemeSyncMode = "off" | "follow" | "sync";
  type InterfaceDensity = "small" | "medium" | "large";

  const PREF_KEYS = useMemo(
    () => ({
      theme: "guardian_theme",
      accent: "guardian_accent_color",
      themeSyncMode: "guardian_theme_sync_mode",
    }),
    [],
  );

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMode, setLoginMode] = useState<"local" | "server">("local");
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [autofillInitialEntry, setAutofillInitialEntry] = useState<PasswordEntry | null>(null);
  const [pendingAutofillSave, setPendingAutofillSave] = useState<PendingAutofillSave | null>(null);
  const [autofillFillRequest, setAutofillFillRequest] = useState<PendingAutofillFillRequest | null>(null);
  const [showAutofillFillManualLogin, setShowAutofillFillManualLogin] = useState(false);
  const savingPendingAutofillRef = useRef(false);
  const pendingAutofillRetryRef = useRef<number | null>(null);
  const autoBiometricAttemptedRef = useRef(false);
  const autofillDebugOnceRef = useRef<{ checked: boolean; error: boolean }>({ checked: false, error: false });
  const autofillFillInFlightRef = useRef(false);
  const [entryCreatedAtMap, setEntryCreatedAtMap] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const raw = localStorage.getItem("guardian_theme");
    return (raw as Theme) || "dark";
  });
  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const raw = localStorage.getItem("guardian_accent_color");
    return (raw as AccentColor) || "yellow";
  });
  const [themeSyncMode, setThemeSyncMode] = useState<ThemeSyncMode>(() => {
    const raw = localStorage.getItem("guardian_theme_sync_mode") as ThemeSyncMode | null;
    return raw || "off";
  });
  const [interfaceDensity, setInterfaceDensity] = useState<InterfaceDensity>(() => {
    const raw = localStorage.getItem(INTERFACE_DENSITY_KEY);
    return raw === "small" || raw === "medium" || raw === "large" ? raw : "medium";
  });
  const [biometricLocalEnabled, setBiometricLocalEnabled] = useState<boolean>(() => localStorage.getItem(BIOMETRIC_LOCAL_PREF_KEY) === "1");
  const [biometricServerEnabled, setBiometricServerEnabled] = useState<boolean>(() => localStorage.getItem(BIOMETRIC_SERVER_PREF_KEY) === "1");
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [accessibilityFillEnabled, setAccessibilityFillEnabled] = useState<boolean>(false);
  const [biometricTypeLabel, setBiometricTypeLabel] = useState<string>("biometrics");
  const [biometricAvailabilityDetail, setBiometricAvailabilityDetail] = useState<string>("");
  const [biometricLocalReady, setBiometricLocalReady] = useState<boolean>(false);
  const [biometricServerReady, setBiometricServerReady] = useState<boolean>(false);
  const [serverSession, setServerSession] = useState<ServerSession | null>(null);
  const [activeView, setActiveView] = useState<"list" | "detail" | "add" | "edit">("list");
  const [activePasswordId, setActivePasswordId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [autofillNotice, setAutofillNotice] = useState<string | null>(null);
  const [autofillLaunchContext, setAutofillLaunchContext] = useState<AutofillLaunchContext>({ inlineAuth: false, activity: "" });
  const [autofillLaunchContextResolved, setAutofillLaunchContextResolved] = useState(false);
  const [inlineAutofillClosing, setInlineAutofillClosing] = useState(false);
  const { lastEvent } = useSSE(
    loginMode === "server" ? serverSession?.serverUrl ?? null : null,
    loginMode === "server" ? serverSession?.authToken ?? null : null,
  );

  useEffect(() => {
    const legacy = localStorage.getItem("guardian_biometric_unlock_enabled");
    if (legacy === "1" && localStorage.getItem(BIOMETRIC_LOCAL_PREF_KEY) == null) {
      localStorage.setItem(BIOMETRIC_LOCAL_PREF_KEY, "1");
      localStorage.removeItem("guardian_biometric_unlock_enabled");
      setBiometricLocalEnabled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: number | null = null;

    const load = async () => {
      attempts += 1;
      try {
        const context = await AutofillBridge.getLaunchContext();
        if (cancelled) return;
        setAutofillLaunchContext(context);
        setAutofillLaunchContextResolved(true);
        return;
      } catch {
        if (cancelled) return;
        if (attempts >= 10) {
          setAutofillLaunchContextResolved(true);
          return;
        }
        timer = window.setTimeout(load, 250);
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    AutofillBridge.setInlineAutofillServerMode({ enabled: biometricServerEnabled }).catch(() => undefined);
  }, [biometricServerEnabled]);

  useEffect(() => {
    AutofillBridge.setAutofillPresentationTheme({ theme }).catch(() => undefined);
  }, [theme]);

  const refreshAccessibilityStatus = useCallback(async () => {
    try {
      const status = await AutofillBridge.getAccessibilityStatus();
      setAccessibilityFillEnabled(!!status.enabled);
    } catch {
      setAccessibilityFillEnabled(false);
    }
  }, []);

  useEffect(() => {
    refreshAccessibilityStatus().catch(() => undefined);
  }, [refreshAccessibilityStatus]);

  const inlineAutofillFlow = autofillLaunchContext.inlineAuth && !!pendingAutofillSave && (inlineAutofillClosing || !isLoggedIn);
  const inlineAutofillFillFlow = autofillLaunchContext.inlineAuth && !!autofillFillRequest && !showAutofillFillManualLogin;

  useEffect(() => {
    document.body.classList.toggle("inline-autofill-sheet", inlineAutofillFlow);
    document.documentElement.classList.toggle("inline-autofill-sheet", inlineAutofillFlow);
    const root = document.getElementById("root");
    root?.classList.toggle("inline-autofill-sheet", inlineAutofillFlow);
    return () => {
      document.body.classList.remove("inline-autofill-sheet");
      document.documentElement.classList.remove("inline-autofill-sheet");
      root?.classList.remove("inline-autofill-sheet");
    };
  }, [inlineAutofillFlow]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        // Some environments/plugins are picky about options; try without first.
        const res = await NativeBiometric.isAvailable();
        if (cancelled) return;
        setBiometricAvailable(!!res.isAvailable);
        setBiometricTypeLabel(biometryLabel(res.biometryType));
        setBiometricAvailabilityDetail(
          res.isAvailable ? "" : `Unavailable (errorCode=${typeof res.errorCode === "number" ? res.errorCode : "n/a"})`,
        );
      } catch (err1) {
        try {
          const res = await NativeBiometric.isAvailable({ useFallback: true });
          if (cancelled) return;
          setBiometricAvailable(!!res.isAvailable);
          setBiometricTypeLabel(biometryLabel(res.biometryType));
          setBiometricAvailabilityDetail(
            res.isAvailable ? "" : `Unavailable (errorCode=${typeof res.errorCode === "number" ? res.errorCode : "n/a"})`,
          );
        } catch (err2) {
          if (cancelled) return;
          setBiometricAvailable(false);
          setBiometricTypeLabel("biometrics");
          const msg =
            (err2 instanceof Error ? err2.message : "") ||
            (err1 instanceof Error ? err1.message : "") ||
            "Native plugin unavailable (are you running the installed app?)";
          setBiometricAvailabilityDetail(msg);
        }
      }
    };

    run().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!biometricAvailable) {
      setBiometricLocalReady(false);
      setBiometricServerReady(false);
      return () => {
        cancelled = true;
      };
    }

    const check = async () => {
      try {
        if (biometricLocalEnabled) {
          await NativeBiometric.getCredentials({ server: BIOMETRIC_LOCAL_SERVER_ID });
          if (!cancelled) setBiometricLocalReady(true);
        } else if (!cancelled) {
          setBiometricLocalReady(false);
        }
      } catch {
        if (!cancelled) setBiometricLocalReady(false);
      }

      try {
        const storedUrl = getStoredServerUrl();
        if (biometricServerEnabled && storedUrl) {
          await NativeBiometric.getCredentials({ server: serverIdFor(storedUrl) });
          if (!cancelled) setBiometricServerReady(true);
        } else if (!cancelled) {
          setBiometricServerReady(false);
        }
      } catch {
        if (!cancelled) setBiometricServerReady(false);
      }
    };

    check().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [biometricAvailable, biometricLocalEnabled, biometricServerEnabled, serverSession?.serverUrl]);

  const filteredPasswords = passwords.filter((p) => {
    const q = searchQuery.toLowerCase();
    const title = (p.title ?? "").toLowerCase();
    const username = (p.username ?? "").toLowerCase();
    const website = (p.website ?? "").toLowerCase();
    return title.includes(q) || username.includes(q) || website.includes(q);
  });

  const autofillTargetPackage = (autofillFillRequest?.packageName ?? "").trim().toLowerCase();
  const autofillTargetAppLabel = (autofillFillRequest?.appLabel ?? "").trim().toLowerCase();
  const displayedPasswords = useMemo(() => {
    if (!autofillFillRequest) return filteredPasswords;

    const rankEntry = (entry: PasswordEntry) => {
      const websitePkg = normalizeAndroidAppWebsite(entry.website ?? "");
      if (autofillTargetPackage && websitePkg === autofillTargetPackage) return 0;
      const title = (entry.title ?? "").trim().toLowerCase();
      if (autofillTargetAppLabel && title === autofillTargetAppLabel) return 1;
      return 2;
    };

    return [...filteredPasswords].sort((a, b) => {
      const byRank = rankEntry(a) - rankEntry(b);
      if (byRank !== 0) return byRank;
      return (b.lastModified ?? "").localeCompare(a.lastModified ?? "");
    });
  }, [autofillFillRequest, autofillTargetAppLabel, autofillTargetPackage, filteredPasswords]);

  const copyToClipboard = async (
    text: string,
    opts?: { sensitive?: boolean; clearAfterMs?: number },
  ): Promise<boolean> => {
    const value = `${text ?? ""}`;
    if (!value) return false;

    if (opts?.sensitive) {
      try {
        const res = await SensitiveClipboard.copy({
          text: value,
          label: "Guardian",
          sensitive: true,
          clearAfterMs: opts.clearAfterMs ?? 30_000,
        });
        if (res?.ok) return true;
      } catch (err) {
        console.warn("SensitiveClipboard copy failed, falling back:", err);
      }
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (err) {
      console.warn("Clipboard API copy failed, falling back:", err);
    }

    // Fallback for WebViews / non-secure contexts.
    try {
      const el = document.createElement("textarea");
      el.value = value;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.top = "0";
      el.style.left = "0";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      el.style.width = "1px";
      el.style.height = "1px";
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch (err) {
      console.error("Fallback copy failed:", err);
      return false;
    }
  };

  const handleCopyUsername = (username: string) => copyToClipboard(username);

  const handleCopyPassword = (password: string) => copyToClipboard(password, { sensitive: true });

  const completeAutofillFill = useCallback(async (entry: PasswordEntry) => {
    if (!autofillFillRequest) return;
    if (autofillFillInFlightRef.current) return;

    autofillFillInFlightRef.current = true;
    setMutationError(null);
    try {
      await AutofillBridge.completeFill({
        username: entry.username || "",
        password: entry.password,
        label: entry.title || entry.username || "Guardian login",
      });
      setAutofillFillRequest(null);
    } catch (err) {
      console.error("Autofill fill failed:", err);
      setMutationError(err instanceof Error ? err.message : "Failed to autofill this login");
    } finally {
      autofillFillInFlightRef.current = false;
    }
  }, [autofillFillRequest]);

  const fillCurrentAppViaAccessibility = useCallback(async (entry: PasswordEntry) => {
    setMutationError(null);
    const result = await AutofillBridge.fillCurrentApp({
      username: entry.username || "",
      password: entry.password,
    });
    if (!result?.ok) throw new Error("Guardian couldn't write into the focused app fields. Make sure Accessibility direct fill is enabled.");
    setAutofillFillRequest(null);
    await AutofillBridge.finishHostActivity().catch(() => undefined);
  }, []);

  const completeAutofillFillResponse = useCallback(async (entries: PasswordEntry[]) => {
    if (!autofillFillRequest) return;
    if (autofillFillInFlightRef.current) return;
    if (!entries.length) return;

    autofillFillInFlightRef.current = true;
    setMutationError(null);
    try {
      await AutofillBridge.completeFillResponse({
        entries: entries.map((entry) => ({
          username: entry.username || "",
          password: entry.password,
          label: entry.title || entry.username || "Guardian login",
        })),
      });
      setAutofillFillRequest(null);
    } catch (err) {
      console.error("Autofill fill response failed:", err);
      setMutationError(err instanceof Error ? err.message : "Failed to prepare autofill suggestions");
    } finally {
      autofillFillInFlightRef.current = false;
    }
  }, [autofillFillRequest]);

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
      applyVaultSettings(decryptedVault.settings);
    } catch (err) {
      console.error("Error loading passwords from vault:", err);
      throw err;
    }
  };

  const applyVaultSettings = (settings?: VaultSettings) => {
    if (!settings) return;

    if (typeof settings.theme === "string") {
      const t = settings.theme as Theme;
      if (loginMode === "local") setTheme(t);
    }

    if (typeof settings.accentColor === "string") {
      const c = settings.accentColor as AccentColor;
      if (loginMode === "local") setAccentColor(c);
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
    applyVaultSettings(vaultData.settings);
  };

  const computedVaultSettings = useMemo<VaultSettings>(
    () => ({
      theme,
      accentColor,
    }),
    [theme, accentColor],
  );

  const savePasswordsToVault = async (updatedPasswords: PasswordEntry[], overrideSettings?: VaultSettings) => {
    if (!vaultPath) {
      throw new Error("No local vault is open, so Guardian can't save this login yet.");
    }
    if (!masterPassword) {
      throw new Error("The local vault is locked, so Guardian can't save this login yet.");
    }

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
      const encryptedVault = await createVault(masterPassword, vaultEntries, overrideSettings ?? computedVaultSettings);
      
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
    setActiveView("list");
    setActivePasswordId(null);
    clearServerSession();
  };

  const handleBiometricLocalEnabledChange = (enabled: boolean) => {
    setMutationError(null);
    setBiometricLocalEnabled(enabled);
    localStorage.setItem(BIOMETRIC_LOCAL_PREF_KEY, enabled ? "1" : "0");

    (async () => {
      if (!biometricAvailable) {
        throw new Error("Biometrics are not available on this device.");
      }

      if (enabled) {
        if (loginMode !== "local" || !vaultPath || !masterPassword) {
          throw new Error("Log in to a local vault first to enable biometric unlock.");
        }
        await NativeBiometric.setCredentials({
          server: BIOMETRIC_LOCAL_SERVER_ID,
          username: vaultPath,
          password: masterPassword,
        });
      } else {
        await NativeBiometric.deleteCredentials({ server: BIOMETRIC_LOCAL_SERVER_ID });
      }
    })().catch((err) => {
      console.error("Biometric toggle failed:", err);
      setMutationError(err instanceof Error ? err.message : "Failed to update biometric settings");
      setBiometricLocalEnabled(!enabled);
      localStorage.setItem(BIOMETRIC_LOCAL_PREF_KEY, !enabled ? "1" : "0");
    });
  };

  const handleBiometricUnlockLocal = async (): Promise<void> => {
    setMutationError(null);

    const available = await NativeBiometric.isAvailable({ useFallback: true });
    if (!available.isAvailable) {
      throw new Error("Biometrics are not available on this device.");
    }

    await NativeBiometric.verifyIdentity({
      title: "Unlock Guardian",
      reason: "Authenticate to unlock your vault",
      useFallback: true,
      maxAttempts: 5,
    });

    const creds = await NativeBiometric.getCredentials({ server: BIOMETRIC_LOCAL_SERVER_ID });
    const { data } = await Filesystem.readFile({
      path: creds.username,
      directory: Directory.Data,
    });

    const vaultBytes =
      typeof data === "string"
        ? base64ToBytes(data)
        : new Uint8Array(await data.arrayBuffer());
    const password = creds.password;

    setLoginMode("local");
    setServerSession(null);
    setVaultPath(creds.username);
    setMasterPassword(password);

    await loadPasswordsFromVault(vaultBytes, password);

    setIsLoggedIn(true);
    setActiveView("list");
    setActivePasswordId(null);
  };

  const enableServerBiometrics = async (accountPassword: string): Promise<void> => {
    setMutationError(null);
    if (!biometricAvailable) throw new Error("Biometrics are not available on this device.");
    if (loginMode !== "server" || !serverSession) throw new Error("Sign in to the server first.");
    if (accountPassword.length < 8) throw new Error("Password must be at least 8 characters.");

    await NativeBiometric.verifyIdentity({
      title: "Enable biometric sign-in",
      reason: "Authenticate to store your sign-in securely",
      useFallback: true,
      maxAttempts: 5,
    });

    await NativeBiometric.setCredentials({
      server: serverIdFor(serverSession.serverUrl),
      username: serverSession.username,
      password: accountPassword,
    });

    setBiometricServerEnabled(true);
    localStorage.setItem(BIOMETRIC_SERVER_PREF_KEY, "1");
  };

  const disableServerBiometrics = async (): Promise<void> => {
    setMutationError(null);
    const storedUrl = getStoredServerUrl();
    if (!storedUrl) {
      setBiometricServerEnabled(false);
      localStorage.setItem(BIOMETRIC_SERVER_PREF_KEY, "0");
      return;
    }

    await NativeBiometric.deleteCredentials({ server: serverIdFor(storedUrl) });
    setBiometricServerEnabled(false);
    localStorage.setItem(BIOMETRIC_SERVER_PREF_KEY, "0");
  };

  const handleBiometricUnlockServer = async (): Promise<void> => {
    setMutationError(null);

    const available = await NativeBiometric.isAvailable({ useFallback: true });
    if (!available.isAvailable) throw new Error("Biometrics are not available on this device.");

    const storedUrl = getStoredServerUrl();
    if (!storedUrl) throw new Error("No server URL stored yet. Sign in once first.");

    await NativeBiometric.verifyIdentity({
      title: "Sign in to Guardian",
      reason: "Authenticate to sign in",
      useFallback: true,
      maxAttempts: 5,
    });

    const creds = await NativeBiometric.getCredentials({ server: serverIdFor(storedUrl) });
    await handleLogin("server", { url: storedUrl, username: creds.username, password: creds.password });
  };

  const activePassword = activePasswordId ? passwords.find((p) => p.id === activePasswordId) : undefined;

  const syncInFlightRef = useRef(false);
  const lastSyncAtRef = useRef(0);
  const mutationInFlightRef = useRef(false);
  const suppressServerVaultUpdatedUntilRef = useRef(0);
  const prefsPersistSigRef = useRef<string>("");
  const prefsPersistTimerRef = useRef<number | null>(null);

  const serverThemeEnabled = loginMode === "server" && themeSyncMode !== "off";
  const serverThemeWritable = loginMode === "server" && themeSyncMode === "sync";
  const canEditTheme = loginMode === "local" || themeSyncMode !== "follow";

  const handleThemeChange = (next: Theme) => {
    if (!canEditTheme) return;
    setTheme(next);
  };

  const handleAccentColorChange = (next: AccentColor) => {
    if (!canEditTheme) return;
    setAccentColor(next);
  };

  const syncFromServer = useCallback(async (opts?: { force?: boolean; bypassDebounce?: boolean }) => {
    if (loginMode !== "server" || !serverSession) return;
    if (!opts?.force && mutationInFlightRef.current) return;
    if (syncInFlightRef.current) return;

    const now = Date.now();
    if (!opts?.bypassDebounce && now - lastSyncAtRef.current < 1000) return; // debounce bursts

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

  const persistPasswords = async (updatedPasswords: PasswordEntry[], changed?: PasswordEntry) => {
    setMutationError(null);
    if (loginMode === "server" && serverSession && changed) {
      const baseEntry = passwordEntryToVaultEntry(changed);
      const originalCreatedAt = entryCreatedAtMap.get(changed.id);
      if (originalCreatedAt) baseEntry.createdAt = originalCreatedAt;

      try {
        mutationInFlightRef.current = true;
        await pushEntriesToServer(serverSession.serverUrl, serverSession.authToken, serverSession.serverKey, [baseEntry]);
        suppressServerVaultUpdatedUntilRef.current = Date.now() + 2500;
      } catch (err) {
        console.warn("[sync] Push failed, reloading vault...", err);
        syncFromServer({ force: true }).catch(() => undefined);
        setMutationError(err instanceof Error ? err.message : "Save failed");
        throw err;
      } finally {
        mutationInFlightRef.current = false;
      }

      // No immediate reload here: the server broadcasts `vault_updated` via SSE, and we also have polling fallback.
      return;
    }

    await savePasswordsToVault(updatedPasswords);
  };

  const deletePassword = async (id: string) => {
    setMutationError(null);
    const prevPasswords = passwords;
    const updatedPasswords = passwords.filter((p) => p.id !== id);
    setPasswords(updatedPasswords);

    if (loginMode === "server" && serverSession) {
      try {
        mutationInFlightRef.current = true;
        // Prefer delete-via-upsert (PUT tombstone) since some environments block DELETE requests.
        await deleteEntryViaUpsertToServer(serverSession.serverUrl, serverSession.authToken, id);
        suppressServerVaultUpdatedUntilRef.current = Date.now() + 2500;
      } catch (err) {
        console.warn("[sync] Delete failed, reloading vault...", err);
        syncFromServer({ force: true }).catch(() => undefined);
        setPasswords(prevPasswords);
        setMutationError(err instanceof Error ? err.message : "Delete failed");
        throw err;
      } finally {
        mutationInFlightRef.current = false;
      }

      // Force a post-delete pull so the item can't reappear due to polling/SSE timing.
      await syncFromServer({ force: true, bypassDebounce: true });

      // Verify deletion applied on the server, but don't hard-fail the UX.
      // Some network stacks can return stale cached GETs briefly.
      const verifyAndRetry = async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          const ids = await fetchVaultItemIdsFromServer(serverSession);
          if (!ids.includes(id)) return true;

          await deleteEntryViaUpsertToServer(serverSession.serverUrl, serverSession.authToken, id);
          await new Promise((r) => window.setTimeout(r, 400));
        }

        // Last resort: try plain DELETE once.
        try {
          await deleteEntryFromServer(serverSession.serverUrl, serverSession.authToken, id);
        } catch {
          // ignore
        }

        const idsFinal = await fetchVaultItemIdsFromServer(serverSession);
        return !idsFinal.includes(id);
      };

      try {
        const ok = await verifyAndRetry();
        if (!ok) {
          // Don't surface as an error unless it actually reappears.
          console.warn(`[sync] Delete verification inconclusive for item ${id} (may be cached GET).`);
        }
      } catch (err) {
        console.warn("[sync] Delete verification failed", err);
      }

      // No immediate reload here: the server broadcasts `vault_updated` via SSE, and we also have polling fallback.
    } else {
      savePasswordsToVault(updatedPasswords).catch(console.error);
    }
  };

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
      setActiveView("list");
      setActivePasswordId(null);
      refreshPendingAutofillSave().catch(() => undefined);

      if (biometricLocalEnabled && biometricAvailable) {
        try {
          await NativeBiometric.setCredentials({
            server: BIOMETRIC_LOCAL_SERVER_ID,
            username: fileName,
            password,
          });
        } catch (err) {
          console.warn("Failed to persist biometric credentials:", err);
        }
      }
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
    setActiveView("list");
    setActivePasswordId(null);
    refreshPendingAutofillSave().catch(() => undefined);

    if (biometricServerEnabled && biometricAvailable) {
      try {
        await NativeBiometric.setCredentials({
          server: serverIdFor(session.serverUrl),
          username,
          password,
        });
      } catch (err) {
        console.warn("Failed to persist server biometric credentials:", err);
      }
    }
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
      if (Date.now() < suppressServerVaultUpdatedUntilRef.current) return;
      syncFromServer().catch(() => undefined);
    }
    if (lastEvent.type === "prefs_updated") {
      if (!serverThemeEnabled) return;
      fetchPreferencesFromServer(serverSession)
        .then((prefs) => {
          // Apply server prefs only when following or syncing.
          if (!serverThemeEnabled) return;
          if (typeof prefs.theme === "string") setTheme(prefs.theme as Theme);
          if (typeof prefs.accentColor === "string") setAccentColor(prefs.accentColor as AccentColor);
        })
        .catch(() => undefined);
    }
  }, [lastEvent, isLoggedIn, loginMode, serverSession, syncFromServer, serverThemeEnabled]);

  // Persist theme + accent changes (local vault settings or server preferences).
  useEffect(() => {
    if (!isLoggedIn) return;

    const sig = `${loginMode}|${serverSession?.serverUrl ?? ""}|${theme}|${accentColor}|${themeSyncMode}|${vaultPath ?? ""}`;
    if (sig === prefsPersistSigRef.current) return;

    if (prefsPersistTimerRef.current) {
      window.clearTimeout(prefsPersistTimerRef.current);
    }

    prefsPersistTimerRef.current = window.setTimeout(() => {
      if (loginMode === "local") {
        savePasswordsToVault(passwords, computedVaultSettings).catch(() => undefined);
      } else if (loginMode === "server" && serverSession && serverThemeWritable) {
        savePreferencesToServer(serverSession, { theme, accentColor }).catch(() => undefined);
      }

      prefsPersistSigRef.current = sig;
    }, 400);

    return () => {
      if (prefsPersistTimerRef.current) {
        window.clearTimeout(prefsPersistTimerRef.current);
        prefsPersistTimerRef.current = null;
      }
    };
  }, [
    isLoggedIn,
    loginMode,
    serverSession,
    theme,
    accentColor,
    themeSyncMode,
    vaultPath,
    computedVaultSettings,
    passwords,
    serverThemeWritable,
  ]);

  // Persist per-device theme preferences locally (even in server mode).
  useEffect(() => {
    localStorage.setItem(PREF_KEYS.theme, theme);
    localStorage.setItem(PREF_KEYS.accent, accentColor);
    localStorage.setItem(PREF_KEYS.themeSyncMode, themeSyncMode);
  }, [PREF_KEYS, theme, accentColor, themeSyncMode]);

  useEffect(() => {
    localStorage.setItem(INTERFACE_DENSITY_KEY, interfaceDensity);
  }, [interfaceDensity]);

  // When toggling Sync Theme ON in server mode, immediately pull server preferences.
  useEffect(() => {
    if (!isLoggedIn || loginMode !== "server" || !serverSession) return;
    if (!serverThemeEnabled) return;
    fetchPreferencesFromServer(serverSession)
      .then((prefs) => {
        if (typeof prefs.theme === "string") setTheme(prefs.theme as Theme);
        if (typeof prefs.accentColor === "string") setAccentColor(prefs.accentColor as AccentColor);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverThemeEnabled, isLoggedIn, loginMode, serverSession?.serverUrl, serverSession?.authToken]);

  // If we enter follow mode, immediately align to server preferences and keep them locked.
  useEffect(() => {
    if (!isLoggedIn || loginMode !== "server" || !serverSession) return;
    if (themeSyncMode !== "follow") return;

    fetchPreferencesFromServer(serverSession)
      .then((prefs) => {
        if (typeof prefs.theme === "string") setTheme(prefs.theme as Theme);
        if (typeof prefs.accentColor === "string") setAccentColor(prefs.accentColor as AccentColor);
      })
      .catch(() => undefined);
  }, [themeSyncMode, isLoggedIn, loginMode, serverSession]);

  // Handle Android back button
  useEffect(() => {
    if (!isLoggedIn) return;

    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      if (showSettings) {
        // If on settings page, go back to main app
        setShowSettings(false);
      } else if (activeView !== "list") {
        setActiveView("list");
        setActivePasswordId(null);
      } else {
        // If on main app, exit the app
        CapacitorApp.exitApp();
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [isLoggedIn, showSettings, activeView]);

  const refreshPendingAutofillSave = useCallback(async (): Promise<PendingAutofillSave | null> => {
    try {
      const res = await AutofillBridge.getPendingSave();
      const pending = res?.pending ?? null;
      if (pending && (!pendingAutofillSave || pending.id !== pendingAutofillSave.id)) {
        setPendingAutofillSave(pending);
        console.warn("[autofill] pending save detected", { id: pending.id, pkg: pending.packageName, app: pending.appLabel });
      } else if (!pending && !autofillDebugOnceRef.current.checked) {
        autofillDebugOnceRef.current.checked = true;
        console.warn("[autofill] getPendingSave() returned null (no pending save found)");
      }
      if (localStorage.getItem("guardian_debug_autofill") === "1") {
        console.info("[autofill] getPendingSave()", pending ? { id: pending.id, pkg: pending.packageName, app: pending.appLabel } : null);
      }
      return pending;
    } catch (err) {
      if (!autofillDebugOnceRef.current.error) {
        autofillDebugOnceRef.current.error = true;
        console.warn("[autofill] getPendingSave() threw", err instanceof Error ? err.message : err);
      }
      if (localStorage.getItem("guardian_debug_autofill") === "1") {
        console.warn("[autofill] getPendingSave() failed", err);
      }
      // Ignore: plugin not available on this platform/build.
      return null;
    }
  }, [pendingAutofillSave]);

  const refreshAutofillFillRequest = useCallback(async (): Promise<PendingAutofillFillRequest | null> => {
    try {
      const res = await AutofillBridge.getFillRequest();
      const request = res?.request ?? null;
      setAutofillFillRequest(request);
      return request;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setShowAutofillFillManualLogin(false);
    autoBiometricAttemptedRef.current = false;
  }, [autofillFillRequest?.packageName, autofillFillRequest?.appLabel]);

  useEffect(() => {
    // On launch, consume any pending Android Autofill save.
    refreshPendingAutofillSave().catch(() => undefined);
    refreshAutofillFillRequest().catch(() => undefined);

    const listener = CapacitorApp.addListener("appStateChange", (state) => {
      if (state.isActive) {
        refreshPendingAutofillSave().catch(() => undefined);
        refreshAutofillFillRequest().catch(() => undefined);
        refreshAccessibilityStatus().catch(() => undefined);
      }
    });

    const onVisibility = () => {
      if (!document.hidden) {
        refreshPendingAutofillSave().catch(() => undefined);
        refreshAutofillFillRequest().catch(() => undefined);
        refreshAccessibilityStatus().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      listener.then((l) => l.remove());
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshAccessibilityStatus, refreshAutofillFillRequest, refreshPendingAutofillSave]);

  useEffect(() => {
    // Live event when a new pending save arrives while the app is running.
    let removed = false;
    let handle: { remove: () => Promise<void> } | null = null;

    AutofillBridge.addListener("pendingSave", (data) => {
      if (removed) return;
      if (localStorage.getItem("guardian_debug_autofill") === "1") {
        console.info("[autofill] event pendingSave", data?.pending ? { id: data.pending.id, pkg: data.pending.packageName } : data);
      }
      if (data?.pending) setPendingAutofillSave(data.pending);
    })
      .then((h) => {
        handle = h;
      })
      .catch(() => undefined);

    return () => {
      removed = true;
      handle?.remove().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    // On some cold starts, plugins aren’t ready immediately; retry a few times.
    if (pendingAutofillSave) return;

    let cancelled = false;
    let attempts = 0;
    const retry = async () => {
      attempts += 1;
      const pending = await refreshPendingAutofillSave().catch(() => null);
      if (cancelled) return;
      if (pending) return;
      if (attempts >= 10) return;
      pendingAutofillRetryRef.current = window.setTimeout(retry, 800);
    };

    pendingAutofillRetryRef.current = window.setTimeout(retry, 200);

    return () => {
      cancelled = true;
      if (pendingAutofillRetryRef.current != null) {
        window.clearTimeout(pendingAutofillRetryRef.current);
        pendingAutofillRetryRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPendingAutofillSave, pendingAutofillSave]);

  const buildAutofillDraft = useCallback((pending: PendingAutofillSave) => {
    const packageName = (pending.packageName ?? "").trim();
    const appLabel = (pending.appLabel ?? "").trim();
    const title = appLabel || fallbackTitleFromPackageName(packageName);
    const website = packageName ? `androidapp://${packageName}` : "";
    const username = (pending.username ?? "").trim();
    const password = pending.password ?? "";
    const notes = packageName ? `Saved from Android app: ${packageName}` : undefined;
    const favicon = (pending.appIconDataUrl ?? "").trim() || undefined;
    return { title, website, username, password, notes, favicon };
  }, []);

  const clearPendingAutofill = useCallback(() => {
    setPendingAutofillSave(null);
    setAutofillInitialEntry(null);
  }, []);

  const savePendingAutofill = useCallback(async () => {
    if (!pendingAutofillSave) return;
    if (!isLoggedIn) return;
    if (loginMode === "server" && !serverSession) return;
    if (savingPendingAutofillRef.current) return;

    const pending = pendingAutofillSave;
    const draft = buildAutofillDraft(pending);
    if (!draft.password.trim()) return;

    savingPendingAutofillRef.current = true;
    console.warn("[autofill] attempting to persist pending save", {
      id: pending.id,
      pkg: pending.packageName,
      app: pending.appLabel,
      mode: loginMode,
    });
    if (localStorage.getItem("guardian_debug_autofill") === "1") {
      console.info("[autofill] savePendingAutofill start", {
        id: pending.id,
        pkg: pending.packageName,
        app: pending.appLabel,
        mode: loginMode,
      });
    }

    const id = pending.id;
    const nowIso = new Date().toISOString();
    const newEntry: PasswordEntry = {
      id,
      title: draft.title,
      website: draft.website,
      username: draft.username,
      password: draft.password,
      favicon: draft.favicon,
      notes: draft.notes,
      category: undefined,
      favorite: false,
      passwordStrength: undefined,
      lastModified: nowIso,
      tags: undefined,
      breached: false,
    };

    setEntryCreatedAtMap((m) => {
      const next = new Map(m);
      next.set(id, nowIso);
      return next;
    });

    const prevPasswords = passwords;
    const updatedPasswords = [newEntry, ...passwords.filter((p) => p.id !== id)];
    setPasswords(updatedPasswords);
    setActivePasswordId(null);
    setActiveView("list");

    try {
      await persistPasswords(updatedPasswords, newEntry);
      if (autofillLaunchContext.inlineAuth) {
        setInlineAutofillClosing(true);
      }
      await AutofillBridge.ackPendingSave({ id }).catch(() => undefined);
      clearPendingAutofill();
      const appName = (draft.title || pending.appLabel || pending.packageName || "app").trim();
      setAutofillNotice(`Saved login from ${appName}.`);
      window.setTimeout(() => setAutofillNotice(null), 3000);
      if (autofillLaunchContext.inlineAuth) {
        window.setTimeout(() => {
          AutofillBridge.finishHostActivity().catch(() => undefined);
        }, 600);
      }
      console.warn("[autofill] pending save persisted + acked", { id });
      if (localStorage.getItem("guardian_debug_autofill") === "1") {
        console.info("[autofill] savePendingAutofill ok", { id });
      }
    } catch (err) {
      console.error(err);
      console.warn("[autofill] pending save persist failed", err instanceof Error ? err.message : err);
      if (localStorage.getItem("guardian_debug_autofill") === "1") {
        console.warn("[autofill] savePendingAutofill failed", err);
      }
      // Keep pending around for a retry.
      setPasswords(prevPasswords);
      if (!autofillLaunchContext.inlineAuth) {
        setActiveView("list");
        setActivePasswordId(null);
      }
      setEntryCreatedAtMap((m) => {
        const next = new Map(m);
        next.delete(id);
        return next;
      });
      setInlineAutofillClosing(false);
      setMutationError(err instanceof Error ? err.message : "Save failed");
    } finally {
      savingPendingAutofillRef.current = false;
    }
  }, [autofillLaunchContext.inlineAuth, buildAutofillDraft, clearPendingAutofill, isLoggedIn, loginMode, passwords, pendingAutofillSave, serverSession]);

  useEffect(() => {
    // The user already confirmed "Save" in the system prompt; save immediately when possible.
    if (!isLoggedIn) return;
    if (!pendingAutofillSave) return;
    void savePendingAutofill();
  }, [isLoggedIn, pendingAutofillSave, savePendingAutofill]);

  useEffect(() => {
    // Server mode can’t restore the encryption key on cold start without re-auth.
    // If biometrics are enabled, prompt immediately so we can complete the pending save.
    if (isLoggedIn) return;
    if (!pendingAutofillSave && !autofillFillRequest) return;
    if (autoBiometricAttemptedRef.current) return;
    const canUseServerBiometrics = biometricServerEnabled && biometricServerReady && !!getStoredServerUrl();
    const canUseLocalBiometrics = biometricLocalEnabled && biometricLocalReady;
    if (!canUseServerBiometrics && !canUseLocalBiometrics) return;
    autoBiometricAttemptedRef.current = true;

    const run = canUseServerBiometrics ? handleBiometricUnlockServer : handleBiometricUnlockLocal;
    run().catch((err) => {
      // If user cancels, keep pending save around; they can log in manually.
      if (autofillLaunchContext.inlineAuth) {
        setMutationError(err instanceof Error ? err.message : "Biometric unlock failed");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autofillFillRequest,
    autofillLaunchContext.inlineAuth,
    biometricLocalEnabled,
    biometricLocalReady,
    biometricServerEnabled,
    biometricServerReady,
    isLoggedIn,
    pendingAutofillSave,
  ]);

  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);
  if (!autofillLaunchContextResolved && pendingAutofillSave && biometricServerEnabled && !isLoggedIn) {
    return (
      <div className={`w-full max-w-[420px] mx-auto ${themeClasses.text} px-3 pt-2 pb-3`}>
        <div className={`w-full rounded-[24px] ${themeClasses.card} border ${themeClasses.border} shadow-xl px-4 py-4`}>
          <p className="text-[15px] font-semibold">Preparing secure save...</p>
          <p className={`text-[12px] mt-1.5 ${themeClasses.textSecondary}`}>Guardian is getting the biometric save ready.</p>
        </div>
      </div>
    );
  }

  if (inlineAutofillFillFlow) {
    const appName = autofillFillRequest?.appLabel || autofillFillRequest?.packageName || "app";
    const compactPackage = (autofillFillRequest?.packageName || "").replace(/^androidapp:\/\//, "");
    const quickMatches = displayedPasswords.slice(0, 6);
    const canRetryBiometric = biometricServerReady || biometricLocalReady;

    return (
      <div className={`w-full max-w-[420px] mx-auto ${themeClasses.text} px-2 pt-2 pb-3`}>
        <div className={`w-full rounded-[24px] ${themeClasses.card} border ${themeClasses.border} shadow-2xl overflow-hidden`}>
          <div className="px-4 pt-2 pb-1 flex justify-center">
            <div className={`h-1 w-10 rounded-full ${themeClasses.border} opacity-60`} />
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-[14px] ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center shadow-sm shrink-0`}>
                <svg className={`w-4.5 h-4.5 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[18px] leading-none font-semibold tracking-tight">Autofill with Guardian</h1>
                  <span className={`text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-full ${accentClasses.lightClass} ${accentClasses.textClass} border ${accentClasses.borderClass}`}>
                    Secure
                  </span>
                </div>
                <p className={`text-[12px] mt-1 ${themeClasses.textSecondary}`}>
                  {isLoggedIn ? "Choose a login to fill without opening the full vault." : `Unlock Guardian for ${appName}.`}
                </p>
              </div>
            </div>

            <div className={`mt-3 rounded-[18px] border ${themeClasses.border} ${themeClasses.inputBg} px-3.5 py-3`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${themeClasses.textMuted}`}>Target App</p>
              <p className="text-[14px] font-medium mt-1.5 break-words">{appName}</p>
              {!!compactPackage && (
                <p className={`text-[10px] mt-0.5 break-words ${themeClasses.textSecondary}`}>{compactPackage}</p>
              )}
            </div>

            {!isLoggedIn ? (
              <>
                <div className={`mt-2.5 rounded-[16px] px-3.5 py-2.5 ${accentClasses.lightClass} border ${accentClasses.borderClass}`}>
                  <p className={`text-[12px] font-medium ${accentClasses.textClass}`}>
                    {autoBiometricAttemptedRef.current ? `Waiting for ${biometricTypeLabel}...` : "Preparing secure autofill..."}
                  </p>
                </div>

                {mutationError && (
                  <p className="mt-2.5 text-[12px] text-red-400">{mutationError}</p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAutofillFillManualLogin(true);
                      setMutationError(null);
                    }}
                    className={`rounded-[14px] border ${themeClasses.border} py-2.5 px-4 text-[13px] font-semibold ${themeClasses.textSecondary}`}
                  >
                    Use form
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      AutofillBridge.cancelFill().catch(() => undefined);
                      setAutofillFillRequest(null);
                    }}
                    className={`rounded-[14px] border ${themeClasses.border} py-2.5 px-4 text-[13px] font-semibold`}
                  >
                    Cancel
                  </button>
                </div>

                {mutationError && canRetryBiometric && (
                  <button
                    type="button"
                    onClick={() => {
                      autoBiometricAttemptedRef.current = false;
                      setMutationError(null);
                    }}
                    className={`mt-2.5 w-full rounded-[14px] ${accentClasses.bgClass} ${accentClasses.onContrastClass} py-2.5 px-4 text-[13px] font-semibold`}
                  >
                    Retry biometrics
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="mt-3 space-y-2.5">
                  {quickMatches.length > 0 ? (
                    quickMatches.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          if (accessibilityFillEnabled) {
                            fillCurrentAppViaAccessibility(entry).catch((err) => {
                              setMutationError(err instanceof Error ? err.message : "Direct fill failed");
                            });
                            return;
                          }
                          completeAutofillFillResponse([entry]).catch(console.error);
                        }}
                        className={`w-full rounded-[18px] border ${themeClasses.border} ${themeClasses.inputBg} px-3.5 py-3 text-left active:scale-[0.99] transition-all`}
                      >
                        <p className="text-[14px] font-semibold truncate">{entry.title || "Untitled"}</p>
                        <p className={`text-[11px] mt-1 truncate ${themeClasses.textSecondary}`}>
                          {entry.username || entry.website || "No username"}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className={`rounded-[18px] border ${themeClasses.border} ${themeClasses.inputBg} px-3.5 py-3`}>
                      <p className="text-[13px] font-medium">No saved login matched yet.</p>
                      <p className={`text-[11px] mt-1 ${themeClasses.textSecondary}`}>Open the full vault if you want to search everything.</p>
                    </div>
                  )}
                </div>

                <div className={`mt-2.5 rounded-[16px] px-3.5 py-2.5 ${accessibilityFillEnabled ? accentClasses.lightClass : themeClasses.inputBg} border ${accessibilityFillEnabled ? accentClasses.borderClass : themeClasses.border}`}>
                  <p className={`text-[12px] font-medium ${accessibilityFillEnabled ? accentClasses.textClass : themeClasses.text}`}>
                    {accessibilityFillEnabled ? "Accessibility direct fill is enabled." : "Enable Accessibility direct fill for stubborn apps."}
                  </p>
                  <p className={`text-[11px] mt-1 ${themeClasses.textSecondary}`}>
                    {accessibilityFillEnabled
                      ? "Guardian will write the selected login straight into the focused app fields."
                      : "Without this permission, Guardian has to rely on Android Autofill, which some apps ignore."}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!accessibilityFillEnabled) {
                        AutofillBridge.openAccessibilitySettings().catch(() => undefined);
                        return;
                      }
                      setShowAutofillFillManualLogin(true);
                    }}
                    className={`rounded-[14px] border ${themeClasses.border} py-2.5 px-4 text-[13px] font-semibold ${themeClasses.textSecondary}`}
                  >
                    {accessibilityFillEnabled ? "Open vault" : "Enable fill"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      AutofillBridge.cancelFill().catch(() => undefined);
                      setAutofillFillRequest(null);
                    }}
                    className={`rounded-[14px] border ${themeClasses.border} py-2.5 px-4 text-[13px] font-semibold`}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (inlineAutofillFlow) {
    const appName = pendingAutofillSave?.appLabel || pendingAutofillSave?.packageName || "app";
    const compactPackage = (pendingAutofillSave?.packageName || "").replace(/^androidapp:\/\//, "");
    const showFailureActions = !inlineAutofillClosing && !!mutationError;
    const showPassiveCancel = !inlineAutofillClosing && !mutationError;
    const statusText = inlineAutofillClosing
      ? "Saved. Closing secure save..."
      : !isLoggedIn
      ? (autoBiometricAttemptedRef.current ? "Confirm your identity to save this login." : "Preparing secure save...")
      : "Saving login to your Guardian Server...";

    return (
      <div className={`w-full max-w-[420px] mx-auto ${themeClasses.text} px-2 pt-2 pb-3`}>
        <div className={`w-full rounded-[24px] ${themeClasses.card} border ${themeClasses.border} shadow-2xl overflow-hidden`}>
          <div className="px-4 pt-2 pb-1 flex justify-center">
            <div className={`h-1 w-10 rounded-full ${themeClasses.border} opacity-60`} />
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-[14px] ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center shadow-sm shrink-0`}>
                <svg className={`w-4.5 h-4.5 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[18px] leading-none font-semibold tracking-tight">Save to Guardian</h1>
                  <span className={`text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-full ${accentClasses.lightClass} ${accentClasses.textClass} border ${accentClasses.borderClass}`}>
                    Server
                  </span>
                </div>
                <p className={`text-[12px] mt-1 ${themeClasses.textSecondary}`}>Secure save without opening Guardian.</p>
              </div>
            </div>

            <div className={`mt-3 rounded-[18px] border ${themeClasses.border} ${themeClasses.inputBg} px-3.5 py-3`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${themeClasses.textMuted}`}>Source App</p>
              <p className="text-[14px] font-medium mt-1.5 break-words">{appName}</p>
              {!!compactPackage && (
                <p className={`text-[10px] mt-0.5 break-words ${themeClasses.textSecondary}`}>{compactPackage}</p>
              )}
            </div>

            <div className={`mt-2.5 rounded-[16px] px-3.5 py-2.5 ${accentClasses.lightClass} border ${accentClasses.borderClass}`}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${accentClasses.bgClass} ${inlineAutofillClosing ? "opacity-100" : "opacity-70"}`} />
                  <span className={`h-2 w-2 rounded-full ${accentClasses.bgClass} ${!isLoggedIn && !inlineAutofillClosing ? "opacity-100" : "opacity-50"}`} />
                  <span className={`h-2 w-2 rounded-full ${accentClasses.bgClass} ${isLoggedIn && !inlineAutofillClosing ? "opacity-100" : "opacity-50"}`} />
                </div>
                <p className={`text-[12px] font-medium ${accentClasses.textClass}`}>{statusText}</p>
              </div>
            </div>

            {mutationError && (
              <p className="mt-2.5 text-[12px] text-red-400">{mutationError}</p>
            )}

            {showFailureActions && (
              <div className="mt-3 flex flex-col gap-2.5">
                {!isLoggedIn && biometricServerEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setMutationError(null);
                      handleBiometricUnlockServer().catch((err) => {
                        setMutationError(err instanceof Error ? err.message : "Biometric unlock failed");
                      });
                    }}
                    className={`rounded-[16px] ${accentClasses.bgClass} ${accentClasses.onContrastClass} py-2.5 px-4 text-[14px] font-semibold active:scale-[0.99] transition-all shadow-lg`}
                  >
                    Retry fingerprint
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      AutofillBridge.finishHostActivity().catch(() => undefined);
                    }}
                    className={`rounded-[14px] border ${themeClasses.border} py-2.5 px-4 text-[13px] font-semibold ${themeClasses.textSecondary}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      AutofillBridge.openMainApp().catch(() => undefined);
                    }}
                    className={`rounded-[14px] border ${themeClasses.border} py-2.5 px-4 text-[13px] font-semibold`}
                  >
                    Open Guardian
                  </button>
                </div>
              </div>
            )}

            {showPassiveCancel && (
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    AutofillBridge.finishHostActivity().catch(() => undefined);
                  }}
                  className={`text-[11px] font-medium px-2 py-1 ${themeClasses.textSecondary}`}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Login Page
  if (!isLoggedIn) {
    return (
      <Login
        onLogin={handleLogin}
        theme={theme}
        accentColor={accentColor}
        autofillPrompt={
          autofillFillRequest
            ? autofillFillRequest.appLabel || autofillFillRequest.packageName || "an app"
            : pendingAutofillSave
              ? pendingAutofillSave.appLabel || pendingAutofillSave.packageName || "an app"
              : undefined
        }
        autofillMode={autofillFillRequest ? "fill" : pendingAutofillSave ? "save" : undefined}
        initialScreen={
          (pendingAutofillSave || autofillFillRequest) && getStoredServerUrl() && getStoredServerUsername() ? "server" : undefined
        }
        biometric={{
          available: biometricAvailable,
          label: biometricTypeLabel,
          localEnabled: biometricLocalEnabled,
          serverEnabled: biometricServerEnabled,
          localReady: biometricLocalReady,
          serverReady: biometricServerReady,
          serverHint: (() => {
            const url = getStoredServerUrl();
            if (!url) return "";
            return url.replace(/^https?:\/\//, "");
          })(),
        }}
        onBiometricUnlockLocal={handleBiometricUnlockLocal}
        onBiometricUnlockServer={handleBiometricUnlockServer}
      />
    );
  }

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
          connectionMode={loginMode}
          biometricAvailable={biometricAvailable}
          biometricTypeLabel={biometricTypeLabel}
          biometricAvailabilityDetail={biometricAvailabilityDetail}
          biometricLocalEnabled={biometricLocalEnabled}
          biometricServerEnabled={biometricServerEnabled}
          accessibilityFillEnabled={accessibilityFillEnabled}
          onOpenAccessibilitySettings={() => {
            AutofillBridge.openAccessibilitySettings().catch(() => undefined);
          }}
          onBiometricLocalEnabledChange={handleBiometricLocalEnabledChange}
          onEnableBiometricServer={enableServerBiometrics}
          onDisableBiometricServer={disableServerBiometrics}
          serverUrl={serverSession?.serverUrl ?? getStoredServerUrl()}
          serverUsername={serverSession?.username ?? getStoredServerUsername()}
          theme={theme}
          onThemeChange={handleThemeChange}
          accentColor={accentColor}
          onAccentColorChange={handleAccentColorChange}
          themeSyncMode={themeSyncMode}
          onThemeSyncModeChange={setThemeSyncMode}
          itemSize={interfaceDensity}
          onItemSizeChange={setInterfaceDensity}
        />
      ) : activeView === "detail" && activePassword ? (
        <PasswordDetail
          password={activePassword}
          theme={theme}
          accentColor={accentColor}
          onBack={() => {
            setActiveView("list");
            setActivePasswordId(null);
          }}
          onEdit={() => setActiveView("edit")}
          onDelete={async () => {
            try {
              await deletePassword(activePassword.id);
              setActiveView("list");
              setActivePasswordId(null);
            } catch (err) {
              console.error(err);
            }
          }}
          onCopyUsername={() => copyToClipboard(activePassword.username)}
          onCopyPassword={() => copyToClipboard(activePassword.password, { sensitive: true })}
        />
      ) : activeView === "add" ? (
        <PasswordForm
          mode="add"
          theme={theme}
          accentColor={accentColor}
          initial={autofillInitialEntry ?? undefined}
          onCancel={() => {
            setAutofillInitialEntry(null);
            setActiveView("list");
          }}
          onSave={(draft) => {
            setAutofillInitialEntry(null);
            const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            const nowIso = new Date().toISOString();
            const newEntry: PasswordEntry = {
              id,
              title: draft.title,
              website: draft.website,
              username: draft.username,
              password: draft.password,
              favicon: draft.favicon,
              notes: draft.notes,
              category: undefined,
              favorite: false,
              passwordStrength: undefined,
              lastModified: nowIso,
              tags: undefined,
              breached: false,
            };

            setEntryCreatedAtMap((m) => {
              const next = new Map(m);
              next.set(id, nowIso);
              return next;
            });

            const updatedPasswords = [newEntry, ...passwords];
            setPasswords(updatedPasswords);
            setActivePasswordId(newEntry.id);
            setActiveView("detail");
            persistPasswords(updatedPasswords, newEntry).catch(console.error);
          }}
        />
      ) : activeView === "edit" && activePassword ? (
        <PasswordForm
          mode="edit"
          theme={theme}
          accentColor={accentColor}
          initial={activePassword}
          onCancel={() => setActiveView("detail")}
          onSave={(draft) => {
            const nowIso = new Date().toISOString();
            const updatedEntry: PasswordEntry = {
              ...activePassword,
              title: draft.title,
              website: draft.website,
              username: draft.username,
              password: draft.password,
              notes: draft.notes,
              lastModified: nowIso,
            };

            const updatedPasswords = passwords.map((p) => (p.id === activePassword.id ? updatedEntry : p));
            setPasswords(updatedPasswords);
            setActiveView("detail");
            persistPasswords(updatedPasswords, updatedEntry).catch(console.error);
          }}
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
              {autofillFillRequest && (
                <div className={`mb-3 rounded-2xl ${accentClasses.lightClass} border ${accentClasses.borderClass} px-3 py-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${accentClasses.textClass}`}>Tap a login to autofill</p>
                      <p className={`text-[11px] mt-1 ${themeClasses.textSecondary}`}>
                        {`Guardian will fill this login into ${autofillFillRequest.appLabel || autofillFillRequest.packageName || "the app"}.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        AutofillBridge.cancelFill().catch(() => undefined);
                        setAutofillFillRequest(null);
                      }}
                      className={`shrink-0 rounded-xl border ${themeClasses.border} px-3 py-2 text-[11px] font-semibold ${themeClasses.textSecondary}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
                  {displayedPasswords.length} {displayedPasswords.length === 1 ? "item" : "items"}
                </p>
                {searchQuery && (
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${accentClasses.textClass}`}>
                    Searching
                  </p>
                )}
              </div>
              {mutationError && (
                <p className="mt-2 text-xs text-red-400 px-1">
                  {mutationError}
                </p>
              )}
              {autofillNotice && !mutationError && (
                <p className="mt-2 text-xs text-green-400 px-1">
                  {autofillNotice}
                </p>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto px-4 pb-24 relative z-10">
            {displayedPasswords.length === 0 ? (
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
                  {searchQuery ? "Try a different search term" : autofillFillRequest ? "No saved logins available to autofill" : "Add your first record to begin"}
                </p>
              </div>
            ) : (
              <PasswordGrid
                passwords={displayedPasswords}
                onCardClick={(id) => {
                  if (autofillFillRequest) {
                    const selected = passwords.find((p) => p.id === id);
                    if (selected) {
                      completeAutofillFill(selected).catch(console.error);
                    }
                    return;
                  }
                  setActivePasswordId(id);
                  setActiveView("detail");
                }}
                onCopyUsername={handleCopyUsername}
                onCopyPassword={handleCopyPassword}
                onDelete={(id) => {
                  deletePassword(id).catch(console.error);
                }}
                autofillMode={!!autofillFillRequest}
                theme={theme}
                accentColor={accentColor}
                itemSize={interfaceDensity}
              />
            )}
          </main>

          {!autofillFillRequest && (
            <button
              onClick={() => {
                setAutofillInitialEntry(null);
                setActiveView("add");
              }}
              className={`fixed right-4 bottom-[84px] w-14 h-14 rounded-2xl ${accentClasses.bgClass} ${accentClasses.onContrastClass} shadow-xl flex items-center justify-center z-30 active:scale-95 transition-all`}
              title="Add"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Bottom Navigation Bar */}
      {activeView === "list" && !showSettings && (
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
      )}
    </div>
  );
}

export default App;
