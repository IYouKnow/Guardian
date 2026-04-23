import type { VaultEntry, VaultData } from "../../../shared/crypto/vault";
import { deriveKey } from "../../../shared/crypto/argon2";
import { decrypt } from "../../../shared/crypto/chacha20";

export interface ServerAuthResponse {
  token: string;
  username: string;
  is_admin: boolean;
}

interface VaultItem {
  id: string;
  encrypted_blob: string;
  revision: number;
}

export type ServerSession = {
  serverUrl: string;
  authToken: string;
  serverKey: Uint8Array;
  username: string;
};

const STORAGE_KEYS = {
  serverUrl: "guardian_server_url",
  token: "guardian_token",
  user: "guardian_user",
  lastUsername: "guardian_server_username",
} as const;

export function getStoredServerUrl(): string {
  return localStorage.getItem(STORAGE_KEYS.serverUrl) ?? "";
}

export function getStoredServerUsername(): string {
  return localStorage.getItem(STORAGE_KEYS.lastUsername) ?? "";
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function clearServerSession() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
}

function cleanUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function ensureUrlHasScheme(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

async function deriveServerKey(password: string, username: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const saltBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(username));
  const salt = new Uint8Array(saltBuffer).slice(0, 16);
  return deriveKey(password, salt);
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.trim();
  } catch {
    return "";
  }
}

export async function loginToServerAndFetchVault(
  url: string,
  username: string,
  password: string,
): Promise<{ vault: VaultData; session: ServerSession }> {
  const base = cleanUrl(ensureUrlHasScheme(url));
  if (!base) throw new Error("Server URL is required");
  if (!username.trim()) throw new Error("Username is required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  // 1) Auth
  const authResp = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!authResp.ok) {
    const body = await readErrorBody(authResp);
    throw new Error(body || "Authentication failed");
  }

  const auth = (await authResp.json()) as ServerAuthResponse;
  const token = auth.token;

  // 2) Derive per-user server key
  const key = await deriveServerKey(password, username);

  // 3) Fetch items
  const itemsResp = await fetch(`${base}/vault/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!itemsResp.ok) {
    const body = await readErrorBody(itemsResp);
    throw new Error(body || "Failed to fetch vault items");
  }

  const items = (await itemsResp.json()) as VaultItem[];
  const entries: VaultEntry[] = [];
  let decryptFailures = 0;

  // 4) Decrypt items
  for (const item of items) {
    const raw = Uint8Array.from(atob(item.encrypted_blob), (c) => c.charCodeAt(0));
    const nonce = raw.slice(0, 12);
    const ciphertext = raw.slice(12);

    try {
      const plaintext = await decrypt(key, nonce, ciphertext);
      const entryStr = new TextDecoder().decode(plaintext);
      entries.push(JSON.parse(entryStr));
    } catch (err) {
      decryptFailures++;
      console.warn(`Failed to decrypt server item ${item.id}`, err);
    }
  }

  if (items.length > 0 && entries.length === 0) {
    throw new Error(
      "Signed in, but failed to decrypt any vault items. Check your password, or verify your device supports the required crypto (Argon2/WebAssembly).",
    );
  }

  // Persist minimal session info for later use.
  localStorage.setItem(STORAGE_KEYS.serverUrl, base);
  localStorage.setItem(STORAGE_KEYS.lastUsername, username);
  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(
    STORAGE_KEYS.user,
    JSON.stringify({ username: auth.username, is_admin: auth.is_admin }),
  );

  return {
    vault: {
      entries,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      settings: { theme: "dark" },
    },
    session: {
      serverUrl: base,
      authToken: token,
      serverKey: key,
      username,
    },
  };
}
