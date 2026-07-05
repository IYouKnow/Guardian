import { useState, useCallback } from "react";
import type { VaultEntry, VaultData } from "../../../shared/crypto/vault";
export interface ExtensionVaultData extends VaultData {
    authToken?: string;
    serverUrl?: string;
    serverKey?: number[];
}
import { deriveKey } from "../../../shared/crypto/argon2";
import { decrypt } from "../../../shared/crypto/chacha20";

interface UseExtensionVaultReturn {
    isLoading: boolean;
    error: string | null;
    serverUrl: string | null;

    loginToServer: (url: string, username: string, password: string) => Promise<ExtensionVaultData>;
    syncVault: (url: string, token: string, keyArray: number[]) => Promise<ExtensionVaultData>;
    registerOnServer: (url: string, data: any) => Promise<void>;
}

interface VaultItem {
    id: string;
    encrypted_blob: string;
    revision: number;
}

export function useExtensionVault(): UseExtensionVaultReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [serverUrl, setServerUrl] = useState<string | null>(null);

    const deriveLegacyKey = async (password: string, username: string): Promise<Uint8Array> => {
        const encoder = new TextEncoder();
        const saltBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(username));
        return deriveKey(password, new Uint8Array(saltBuffer).slice(0, 16));
    };

    async function decryptEntries(items: VaultItem[], key: Uint8Array): Promise<VaultEntry[]> {
        const entries: VaultEntry[] = [];
        for (const item of items) {
            if (item.id === "settings") continue;
            const raw = Uint8Array.from(atob(item.encrypted_blob), c => c.charCodeAt(0));
            if (raw.length < 28) continue;
            const nonce = raw.slice(0, 12);
            const ciphertext = raw.slice(12);
            try {
                const plaintext = await decrypt(key, nonce, ciphertext);
                entries.push(JSON.parse(new TextDecoder().decode(plaintext)));
            } catch { /* skip */ }
        }
        return entries;
    }

    const loginToServer = useCallback(async (url: string, username: string, password: string): Promise<ExtensionVaultData> => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Auth with Server
            // Remove trailing slash if present
            const cleanUrl = url.replace(/\/$/, "");

            const resp = await fetch(`${cleanUrl}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (!resp.ok) {
                throw new Error("Authentication failed");
            }

            const data = await resp.json();
            const token = data.token;
            const saltBase64 = data.salt;
            if (!saltBase64) throw new Error("Server did not return a salt. Update your server.");
            setServerUrl(cleanUrl);

            // 2. Derive Key — try server salt, fall back to legacy username hash
            const saltBytes = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
            let key = await deriveKey(password, saltBytes);

            // 3. Fetch Items
            const itemsResp = await fetch(`${cleanUrl}/vault/items`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!itemsResp.ok) throw new Error("Failed to fetch vault items");

            const items: VaultItem[] = await itemsResp.json();

            // 4. Try new salted key first
            let entries = await decryptEntries(items, key);

            // Legacy fallback for existing vaults
            if (entries.length === 0 && items.some(i => i.id !== "settings")) {
                const legacyKey = await deriveLegacyKey(password, username);
                entries = await decryptEntries(items, legacyKey);
                if (entries.length > 0) key = legacyKey;
            }

            return {
                entries,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                settings: { theme: 'dark' },
                authToken: token,
                serverUrl: cleanUrl,
                serverKey: Array.from(key)
            };

        } catch (err) {
            const msg = err instanceof Error ? err.message : "Server login failed";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const syncVault = useCallback(async (url: string, token: string, keyArray: number[]): Promise<ExtensionVaultData> => {
        setIsLoading(true);
        setError(null);

        try {
            const cleanUrl = url.replace(/\/$/, "");
            const key = new Uint8Array(keyArray);

            const itemsResp = await fetch(`${cleanUrl}/vault/items`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!itemsResp.ok) throw new Error("Failed to fetch vault items");

            const items: VaultItem[] = await itemsResp.json();
            const entries = await decryptEntries(items, key);

            return {
                entries,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                settings: { theme: 'dark' },
                authToken: token,
                serverUrl: cleanUrl,
                serverKey: keyArray
            };

        } catch (err) {
            const msg = err instanceof Error ? err.message : "Sync failed";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const registerOnServer = useCallback(async (url: string, data: any) => {
        setIsLoading(true);
        setError(null);
        try {
            const cleanUrl = url.replace(/\/$/, "");
            const resp = await fetch(`${cleanUrl}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(txt || "Registration failed");
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Registration failed";
            setError(msg);
            throw msg;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        serverUrl,
        loginToServer,
        syncVault,
        registerOnServer
    };
}
