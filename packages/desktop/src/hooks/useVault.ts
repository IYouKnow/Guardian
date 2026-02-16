import { useState, useCallback } from "react";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { VaultEntry, VaultData, VaultSettings, loadVault, createVault } from "../../../shared/crypto/vault";
import { deriveKey } from "../../../shared/crypto/argon2";
import { encrypt, decrypt, generateNonce } from "../../../shared/crypto/chacha20";

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
  saveVaultFile: (entries: VaultEntry[], settings?: VaultSettings) => Promise<void>;
  createNewVault: (path: string, password: string) => Promise<void>;

  // Server Mode
  connectionMode: "local" | "server";
  loginToServer: (url: string, username: string, password: string) => Promise<VaultData>;
  registerOnServer: (url: string, data: any) => Promise<void>;
}

interface VaultItem {
  id: string;
  encrypted_blob: string;
  revision: number;
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
  const [serverKey, setServerKey] = useState<Uint8Array | null>(null);

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

  const deriveServerKey = async (password: string, username: string): Promise<Uint8Array> => {
    // For MVP: Use SHA-256 of username as salt. 
    // In production, server should provide a per-user salt on registration.
    const encoder = new TextEncoder();
    const saltBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(username));
    const salt = new Uint8Array(saltBuffer).slice(0, 16);

    return deriveKey(password, salt);
  };

  const loginToServer = useCallback(async (url: string, username: string, password: string): Promise<VaultData> => {
    setIsLoading(true);
    setError(null);
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

      let data;
      try {
        data = await resp.json();
      } catch (parseErr) {
        // If JSON fails, read text to see what we got (likely HTML)
        const text = await resp.text(); // This might fail if body already consumed? No, .json() consumes it. 
        // We can't read body twice properly unless we clone.
        console.error("Failed to parse JSON response. Status:", resp.status);
        console.error("Response body:", text);
        // Note: resp.json() consumes body. If it failed, we can't easily read it again usually?
        // Actually, if .json() fails, the stream might be partially read.
        // Better approach: Get text first, then parse.
        throw new Error("Invalid server response (not JSON)");
      }
      const token = data.token;
      setAuthToken(token);
      setServerUrl(url);

      // 2. Derive Key (Once)
      const key = await deriveServerKey(password, username);
      setServerKey(key);

      // 3. Fetch Items
      const itemsResp = await fetch(`${url}/vault/items`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!itemsResp.ok) throw new Error("Failed to fetch vault items");

      const items: VaultItem[] = await itemsResp.json();
      const entries: VaultEntry[] = [];

      // 4. Decrypt Items
      for (const item of items) {
        // Blob format: Base64 string -> [Nonce 12][Ciphertext N]
        const raw = Uint8Array.from(atob(item.encrypted_blob), c => c.charCodeAt(0));
        const nonce = raw.slice(0, 12);
        const ciphertext = raw.slice(12);

        try {
          const plaintext = await decrypt(key, nonce, ciphertext);
          const entryStr = new TextDecoder().decode(plaintext);
          entries.push(JSON.parse(entryStr));
        } catch (e) {
          console.warn(`Failed to decrypt item ${item.id}`, e);
        }
      }

      return {
        entries,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        settings: { theme: 'dark' } // Default settings for server mode for now
      };

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Server login failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveToServer = async (entries: VaultEntry[], _settings?: VaultSettings) => {
    if (!serverUrl || !authToken || !serverKey) throw new Error("Not connected to server");

    const itemsToSync: any[] = [];

    for (const entry of entries) {
      const json = JSON.stringify(entry);
      const plaintext = new TextEncoder().encode(json);
      const nonce = generateNonce();
      // ChaCha20 returns ciphertext + tag
      const encrypted = await encrypt(serverKey, nonce, plaintext);

      // Pack: Nonce + Encrypted
      const finalObj = new Uint8Array(nonce.length + encrypted.length);
      finalObj.set(nonce);
      finalObj.set(encrypted, nonce.length);

      // To Base64
      const b64 = btoa(String.fromCharCode(...finalObj));

      itemsToSync.push({
        id: entry.id,
        encrypted_blob: b64,
        revision: 1 // Simple revision for now
      });
    }

    // TODO: Save Settings separately (maybe special ID 'settings')

    await fetch(`${serverUrl}/vault/items`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(itemsToSync)
    });
  };

  // --- UNIFIED SAVE ---
  const saveVaultFile = useCallback(
    async (entries: VaultEntry[], settings?: VaultSettings): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (connectionMode === "local") {
          if (!vaultPath || !masterPassword) {
            throw new Error("Vault path or master password not set");
          }
          const encryptedVault = await createVault(masterPassword, entries, settings);
          await writeFile(vaultPath, encryptedVault);
        } else {
          // Server Mode Save
          await saveToServer(entries, settings);
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
    [vaultPath, masterPassword, connectionMode, serverUrl, authToken, serverKey]
  );

  const logout = useCallback(() => {
    setVaultPath(null);
    setMasterPassword("");
    setAuthToken(null);
    setServerKey(null);
    setError(null);
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

    // Server Specific
    connectionMode,
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

