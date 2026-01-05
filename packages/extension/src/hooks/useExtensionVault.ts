import { useState, useCallback } from "react";
import { VaultEntry, VaultData } from "../../../shared/crypto/vault";
import { deriveKey } from "../../../shared/crypto/argon2";
import { decrypt } from "../../../shared/crypto/chacha20";

interface UseExtensionVaultReturn {
    isLoading: boolean;
    error: string | null;
    serverUrl: string | null;

    loginToServer: (url: string, username: string, password: string) => Promise<VaultData>;
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

    const deriveServerKey = async (password: string, username: string): Promise<Uint8Array> => {
        // For MVP: Use SHA-256 of username as salt.
        const encoder = new TextEncoder();
        const saltBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(username));
        const salt = new Uint8Array(saltBuffer).slice(0, 16);

        return deriveKey(password, salt);
    };

    const loginToServer = useCallback(async (url: string, username: string, password: string): Promise<VaultData> => {
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
            setServerUrl(cleanUrl);

            // 2. Derive Key
            const key = await deriveServerKey(password, username);

            // 3. Fetch Items
            const itemsResp = await fetch(`${cleanUrl}/vault/items`, {
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
                settings: { theme: 'dark' }
            };

        } catch (err) {
            const msg = err instanceof Error ? err.message : "Server login failed";
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
        registerOnServer
    };
}
