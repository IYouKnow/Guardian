import { useState, useCallback, useRef } from "react";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { VaultEntry, VaultData, VaultSettings, FolderNode, loadVault, createVault } from "@guardian/core/crypto/vault";
import { deriveKey } from "@guardian/core/crypto/argon2";
import { packBlob, unpackBlob, isLegacyBlob } from "@guardian/core/crypto/chacha20";

interface UseVaultReturn {
  // Common
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  logout: () => void;

  // Local File Mode
  vaultPath: string | null;
  setVaultPath: (path: string | null) => void;
  setMasterPassword: (password: string) => void;
  loadVaultFile: (path: string, password: string) => Promise<VaultData>;
  saveVaultFile: (entries: VaultEntry[], settings?: VaultSettings, folders?: FolderNode[]) => Promise<void>;
  createNewVault: (path: string, password: string) => Promise<void>;

  // Server Mode
  connectionMode: "local" | "server";
  serverUrl: string | null;
  authToken: string | null;
  username: string | null;
  loginToServer: (url: string, username: string, password: string) => Promise<VaultData>;
  registerOnServer: (url: string, data: any) => Promise<void>;
  syncVault: () => Promise<VaultData>;
}

interface VaultItem {
  id: string;
  encrypted_blob: string;
  revision: number;
}

function normalizeUrl(url: string): string {
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

export function useVault(): UseVaultReturn {
  const [connectionMode, setConnectionMode] = useState<"local" | "server">("local");

  // Local State
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [
    masterPassword,
    setMasterPassword // Only used for local file saves basically
  ] = useState<string>("");

  // Server State
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const serverKeyRef = useRef<Uint8Array | null>(null);
  const serverUrlRef = useRef<string | null>(null);
  const authTokenRef = useRef<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- LOCAL MODE HANDLERS ---

  const loadVaultFile = useCallback(async (path: string, password: string): Promise<VaultData> => {
    setIsLoading(true);
    setError(null);
    setConnectionMode("local");

    try {
      const vaultData = await readFile(path);
      const vaultBytes =
        vaultData instanceof Uint8Array ? vaultData : new Uint8Array(vaultData);

      const decryptedVault = await loadVault(password, vaultBytes);

      setVaultPath(path);
      setMasterPassword(password);

      return decryptedVault;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to load vault. Invalid password or corrupted file.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNewVault = useCallback(
    async (path: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      setConnectionMode("local");

      try {
        const encryptedVault = await createVault(password, []);
        await writeFile(path, encryptedVault, { createNew: true });

        setVaultPath(path);
        setMasterPassword(password);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create vault";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // --- SERVER MODE HANDLERS ---

  const deriveLegacyKey = async (password: string, username: string): Promise<Uint8Array> => {
    const encoder = new TextEncoder();
    const saltBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(username));
    return deriveKey(password, new Uint8Array(saltBuffer).slice(0, 16));
  };

  async function decryptItemsFromServer(
    items: VaultItem[],
    key: Uint8Array,
  ): Promise<{ entries: VaultEntry[]; settings: VaultSettings | undefined; folders: FolderNode[] | undefined; successCount: number; legacyFound: boolean }> {
    const entries: VaultEntry[] = [];
    let settings: VaultSettings | undefined;
    let folders: FolderNode[] | undefined;
    let successCount = 0;
    let legacyFound = false;

    for (const item of items) {
      const raw = Uint8Array.from(atob(item.encrypted_blob), c => c.charCodeAt(0));
      if (raw.length < 28) continue;

      try {
        if (isLegacyBlob(raw)) legacyFound = true;
        const plaintext = await unpackBlob(key, raw);
        const jsonStr = new TextDecoder().decode(plaintext);

        if (item.id === "settings") {
          settings = JSON.parse(jsonStr);
        } else if (item.id === "folders") {
          folders = JSON.parse(jsonStr);
        } else {
          entries.push(JSON.parse(jsonStr));
        }
        successCount++;
      } catch {
        // skip
      }
    }

    return { entries, settings, folders, successCount, legacyFound };
  }

  const loginToServer = useCallback(async (url: string, username: string, password: string): Promise<VaultData> => {
    setIsLoading(true);
    setError(null);
    url = normalizeUrl(url);
    url = url.endsWith("/") ? url.slice(0, -1) : url;
    setConnectionMode("server");

    try {
      // 1. Auth with Server
      const resp = await fetch(`${url}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!resp.ok) {
        throw new Error("Authentication failed");
      }

      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("Failed to parse JSON response. Status:", resp.status);
        console.error("Response body:", text);
        throw new Error("Invalid server response (not JSON)");
      }
      const token = data.token;
      const saltBase64: string | undefined = data.salt;
      setAuthToken(token);
      authTokenRef.current = token;
      setServerUrl(url);
      serverUrlRef.current = url;
      setUsername(username);

      // 2. Derive Key — use server-provided salt, fall back to legacy username hash
      if (!saltBase64) {
        throw new Error("Server did not return a salt. Update your server.");
      }
      const saltBytes = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));

      // 3. Fetch Items
      const itemsResp = await fetch(`${url}/vault/items`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!itemsResp.ok) throw new Error("Failed to fetch vault items");

      const items: VaultItem[] = await itemsResp.json();

      // Debug: store item count for production debugging
      const loginDebug = (window as any).__vaultDebug || {};
      loginDebug.itemsFetched = items.length;
      (window as any).__vaultDebug = loginDebug;

      // 4. Try new salted key first
      let key = await deriveKey(password, saltBytes);
      let decryptResult = await decryptItemsFromServer(items, key);
      let usedLegacyFallback = false;

      const di = { newKeySuccess: decryptResult.successCount, newKeyEntries: decryptResult.entries.length, itemsLen: items.length, legacySuccess: 0, chosenEntries: decryptResult.entries.length, step: 'after-new' };
      (window as any).__vaultDebug = di;
      console.log(`[useVault] Login: new key decrypted ${decryptResult.successCount}/${items.length} items, entries: ${decryptResult.entries.length}`);

      // If not all items decrypted, try legacy username-based salt (migration for existing vaults)
      if (decryptResult.successCount < items.length && items.some(i => i.id !== "settings" && i.id !== "folders")) {
        const legacyKey = await deriveLegacyKey(password, username);
        const legacyResult = await decryptItemsFromServer(items, legacyKey);
        console.log(`[useVault] Login: legacy key decrypted ${legacyResult.successCount}/${items.length} items`);
        if (legacyResult.successCount > decryptResult.successCount) {
          decryptResult = legacyResult;
          key = legacyKey;
          usedLegacyFallback = true;
          di.legacySuccess = legacyResult.successCount;
          di.chosenEntries = legacyResult.entries.length;
          di.step = 'chose-legacy';
          console.log("[useVault] Used legacy key derivation (username-based salt). Will migrate.");
        } else {
          di.legacySuccess = legacyResult.successCount;
          di.step = 'stayed-new';
        }
      }

      di.chosenEntries = decryptResult.entries.length;
      di.step = di.step + '|before-return';
      serverKeyRef.current = key;

      // Migrate to the current formats: re-encrypt with the new salted key if the
      // legacy KDF was used, and/or rewrite any legacy (v1/v2) blobs as v3.
      if (usedLegacyFallback || decryptResult.legacyFound) {
        const migrationKey = usedLegacyFallback ? await deriveKey(password, saltBytes) : key;
        serverKeyRef.current = migrationKey;
        // Re-encrypt and push all items back to server with the current format
        await saveToServer(decryptResult.entries, decryptResult.settings, decryptResult.folders);
        console.log("[useVault] Migrated vault items to current key derivation and encryption format");
      }

      // Clean up junk items with invalid encrypted blobs
      const shortBlobIds = items
        .filter(i => {
          const raw = Uint8Array.from(atob(i.encrypted_blob), c => c.charCodeAt(0));
          return raw.length < 28;
        })
        .map(i => i.id);
      if (shortBlobIds.length > 0) {
        const cleanupResp = await fetch(`${url}/vault/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(shortBlobIds.map(id => ({ id, encrypted_blob: "", revision: 0 }))),
        }).catch(() => null);
        console.log(`[useVault] Removed ${shortBlobIds.length} junk items from server`, cleanupResp?.ok ? "OK" : "FAILED", shortBlobIds);
      }

      // 5. Fetch Preferences (Web Sync)
      let remotePrefs: Partial<VaultSettings> = {};
      try {
        const prefResp = await fetch(`${url}/api/preferences`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (prefResp.ok) {
          try {
            remotePrefs = await prefResp.json();
          } catch (jsonErr) {
            console.warn("Failed to parse preferences JSON, server might be returning HTML (404/500) or empty body");
            // Optional: read text to debug
            // const text = await prefResp.text(); console.warn("Response:", text);
          }
        }
      } catch (e) { console.warn("Failed to fetch preferences", e); }

      const finalSettings = { ...decryptResult.settings, ...remotePrefs };

      return {
        entries: decryptResult.entries,
        folders: decryptResult.folders,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        settings: (Object.keys(finalSettings).length > 0 ? finalSettings : { theme: 'dark' }) as VaultSettings
      };

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Server login failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveToServer = async (entries: VaultEntry[], settings?: VaultSettings, folders?: FolderNode[]) => {
    if (!serverUrlRef.current || !authTokenRef.current || !serverKeyRef.current) throw new Error("Not connected to server");
    const key = serverKeyRef.current;

    const itemsToSync: any[] = [];

    // Encrypt Helper
    const encryptItem = async (data: any) => {
      const json = JSON.stringify(data);
      const plaintext = new TextEncoder().encode(json);

      // Wire format: [0x03 marker][24-byte nonce][ciphertext + 16-byte tag]
      return bytesToBase64(await packBlob(key, plaintext));
    }

    // 1. Process standard entries
    for (const entry of entries) {
      const b64 = await encryptItem(entry);
      itemsToSync.push({
        id: entry.id,
        encrypted_blob: b64,
        revision: 1
      });
    }

    // 2. Process Settings (Special ID 'settings')
    if (settings) {
      const b64 = await encryptItem(settings);
      itemsToSync.push({
        id: "settings",
        encrypted_blob: b64,
        revision: 1
      });
    }

    // 3. Process Folders (Special ID 'folders')
    if (folders) {
      const b64 = await encryptItem(folders);
      itemsToSync.push({
        id: "folders",
        encrypted_blob: b64,
        revision: 1
      });
    }

    const vaultResp = await fetch(`${serverUrlRef.current}/vault/items`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authTokenRef.current}`
      },
      body: JSON.stringify(itemsToSync)
    });
    if (!vaultResp.ok) {
      const errText = await vaultResp.text();
      console.error(`[useVault] Vault push failed: ${vaultResp.status} ${errText}`);
      throw new Error(`Vault push failed: ${vaultResp.status}`);
    }

    // Save preferences to API (Web Sync)
    if (settings) {
      try {
        await fetch(`${serverUrlRef.current}/api/preferences`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authTokenRef.current}`
          },
          body: JSON.stringify({ theme: settings.theme, accentColor: settings.accentColor })
        });
      } catch (e) {
        console.warn("Failed to save preferences to API", e);
      }
    }
  };

  // --- UNIFIED SAVE ---
  const saveVaultFile = useCallback(
    async (entries: VaultEntry[], settings?: VaultSettings, folders?: FolderNode[]): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (connectionMode === "local") {
          if (!vaultPath || !masterPassword) {
            throw new Error("Vault path or master password not set");
          }
          const encryptedVault = await createVault(masterPassword, entries, settings, folders);
          await writeFile(vaultPath, encryptedVault);
        } else {
          // Server Mode Save
          await saveToServer(entries, settings, folders);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save vault";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [vaultPath, masterPassword, connectionMode]
  );

  // --- SYNC HANDLER ---
  const syncVault = useCallback(async (): Promise<VaultData> => {
    if (!serverUrlRef.current || !authTokenRef.current || !serverKeyRef.current) throw new Error("Not connected to server");

    setIsLoading(true);
    setError(null);

    try {
      const itemsResp = await fetch(`${serverUrlRef.current}/vault/items`, {
        headers: { "Authorization": `Bearer ${authTokenRef.current}` }
      });

      if (!itemsResp.ok) throw new Error("Failed to fetch vault items");

      const items: VaultItem[] = await itemsResp.json();
      console.log(`[useVault] Sync fetched ${items.length} items from server`);
      const decryptResult = await decryptItemsFromServer(items, serverKeyRef.current);
      console.log(`[useVault] Sync decrypted ${decryptResult.successCount}/${items.length} items, returning ${decryptResult.entries.length} entries`);
      const { entries, folders, settings } = decryptResult;

      // Eagerly re-encrypt any legacy (v1/v2) items to the current (v3) format.
      if (decryptResult.legacyFound) {
        await saveToServer(entries, settings, folders);
        console.log("[useVault] Migrated legacy vault items to the current encryption format");
      }

      // Clean up junk items with invalid encrypted blobs
      const shortBlobIds = items
        .filter(i => {
          const raw = Uint8Array.from(atob(i.encrypted_blob), c => c.charCodeAt(0));
          return raw.length < 28;
        })
        .map(i => i.id);
      if (shortBlobIds.length > 0) {
        const cleanupResp = await fetch(`${serverUrlRef.current}/vault/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authTokenRef.current}` },
          body: JSON.stringify(shortBlobIds.map(id => ({ id, encrypted_blob: "", revision: 0 }))),
        }).catch(() => null);
        console.log(`[useVault] Removed ${shortBlobIds.length} junk items from server`, cleanupResp?.ok ? "OK" : "FAILED", shortBlobIds);
      }

      // Fetch Preferences (Web Sync)
      let remotePrefs: Partial<VaultSettings> = {};
      try {
        console.log("[useVault] Fetching preferences from:", `${serverUrlRef.current}/api/preferences`);
        const prefResp = await fetch(`${serverUrlRef.current}/api/preferences`, {
          headers: { "Authorization": `Bearer ${authTokenRef.current}` }
        });
        if (prefResp.ok) {
          try {
            remotePrefs = await prefResp.json();
            console.log("[useVault] Received preferences:", remotePrefs);
          } catch {
            console.warn("Failed to parse preferences JSON during sync");
          }
        } else {
          console.warn("[useVault] Preferences fetch failed:", prefResp.status);
        }
      } catch (e) { console.warn("Failed to fetch preferences", e); }

      const finalSettings = { ...settings, ...remotePrefs };

      return {
        entries,
        folders,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        settings: (Object.keys(finalSettings).length > 0 ? finalSettings : { theme: 'dark' }) as VaultSettings
      };

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setVaultPath(null);
    setMasterPassword("");
    setAuthToken(null);
    authTokenRef.current = null;
    setServerUrl(null);
    serverUrlRef.current = null;
    setUsername(null);
    setError(null);
    if (serverKeyRef.current) {
      serverKeyRef.current.fill(0);
      serverKeyRef.current = null;
    }
  }, []);

  return {
    vaultPath,
    setVaultPath, // Only for local really
    setMasterPassword, // Only for local really

    isAuthenticated: (connectionMode === 'local' && !!vaultPath && !!masterPassword) || (connectionMode === 'server' && !!authToken),
    isLoading,
    error,

    // Actions
    loadVaultFile,
    saveVaultFile,
    createNewVault,
    logout,
    syncVault,

    // Server Specific
    connectionMode,
    serverUrl,
    authToken,
    username,
    loginToServer,
    registerOnServer: async (url: string, data: any) => {
      const resp = await fetch(`${url}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
    }
  };
}

