import type { VaultEntry, VaultData, VaultSettings } from "@guardian/shared/crypto/vault";
import { deriveKey } from "@guardian/shared/crypto/argon2";
import { decrypt } from "@guardian/shared/crypto/chacha20";
import { httpRequest } from "./http";
import { sha256 } from "./sha256";

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
  const salt = sha256(new TextEncoder().encode(username)).slice(0, 16);
  return deriveKey(password, salt);
}

function errorMessageFromHttpResult(result: { status: number; text: string }): string {
  const body = result.text.trim();
  if (body) return body;
  if (result.status === 401) return "Authentication failed";
  return `Request failed (${result.status})`;
}

function isLocalhostUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
  } catch {
    return false;
  }
}

const warnedDecryptIds = new Set<string>();

function decodeBase64ToBytes(input: string): Uint8Array | null {
  const raw = (input || "").trim();
  if (!raw) return new Uint8Array();

  // Be forgiving: accept base64url and missing padding.
  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? `${normalized}${"=".repeat(4 - pad)}` : normalized;

  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function decryptVaultItems(
  items: VaultItem[],
  key: Uint8Array,
): Promise<{ entries: VaultEntry[]; settings?: VaultSettings; candidateCount: number }> {
  const entries: VaultEntry[] = [];
  let settings: VaultSettings | undefined;
  let candidateCount = 0;

  for (const item of items) {
    const bytes = decodeBase64ToBytes(item.encrypted_blob);
    if (!bytes) {
      if (!warnedDecryptIds.has(item.id)) {
        warnedDecryptIds.add(item.id);
        console.warn(`Failed to decode server item ${item.id}: invalid base64`);
      }
      continue;
    }

    // Blob format: [Nonce 12][Ciphertext N][Tag 16] => min length 28.
    if (bytes.length < 28) {
      if (!warnedDecryptIds.has(item.id)) {
        warnedDecryptIds.add(item.id);
        console.warn(`Failed to decrypt server item ${item.id}: encrypted_blob too short (${bytes.length} bytes)`);
      }
      continue;
    }

    candidateCount += 1;

    const nonce = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    try {
      const plaintext = await decrypt(key, nonce, ciphertext);
      const entryStr = new TextDecoder().decode(plaintext);
      if (item.id === "settings") {
        settings = JSON.parse(entryStr) as VaultSettings;
      } else {
        entries.push(JSON.parse(entryStr));
      }
    } catch (err) {
      if (!warnedDecryptIds.has(item.id)) {
        warnedDecryptIds.add(item.id);
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Failed to decrypt server item ${item.id}: ${msg}`);
      }
    }
  }

  return { entries, settings, candidateCount };
}

export async function fetchVaultFromServer(session: ServerSession): Promise<VaultData> {
  const itemsResp = await httpRequest(`${cleanUrl(session.serverUrl)}/vault/items?ts=${Date.now()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.authToken}` },
  });

  if (!itemsResp.ok) {
    throw new Error(itemsResp.text || "Failed to fetch vault items");
  }

  const items = (itemsResp.json ?? []) as VaultItem[];
  const decrypted = await decryptVaultItems(items, session.serverKey);
  const prefs = await fetchPreferencesFromServer(session).catch(() => ({} as VaultSettings));
  const mergedSettings = { ...(decrypted.settings ?? {}), ...(prefs ?? {}) } as VaultSettings;

  if (items.length > 0 && decrypted.entries.length === 0 && decrypted.candidateCount > 0) {
    throw new Error(
      "Signed in, but failed to decrypt any vault items. Check your password, or verify your device supports the required crypto (Argon2/WebAssembly).",
    );
  }

  return {
    entries: decrypted.entries,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    settings: mergedSettings,
  };
}

export async function fetchVaultItemIdsFromServer(session: ServerSession): Promise<string[]> {
  const itemsResp = await httpRequest(`${cleanUrl(session.serverUrl)}/vault/items?ts=${Date.now()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.authToken}` },
  });

  if (!itemsResp.ok) {
    throw new Error(itemsResp.text || "Failed to fetch vault items");
  }

  const items = (itemsResp.json ?? []) as Array<{ id?: string }>;
  return items
    .map((i) => i.id ?? "")
    .filter((id) => id && id !== "settings");
}

export async function fetchPreferencesFromServer(session: ServerSession): Promise<VaultSettings> {
  const resp = await httpRequest(`${cleanUrl(session.serverUrl)}/api/preferences?ts=${Date.now()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.authToken}` },
  });

  if (!resp.ok) {
    throw new Error(resp.text || `Failed to fetch preferences (${resp.status})`);
  }

  return (resp.json ?? {}) as VaultSettings;
}

export async function savePreferencesToServer(
  session: ServerSession,
  prefs: Pick<VaultSettings, "theme" | "accentColor">,
): Promise<void> {
  const resp = await httpRequest(`${cleanUrl(session.serverUrl)}/api/preferences`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${session.authToken}` },
    json: prefs,
  });

  if (!resp.ok) {
    throw new Error(resp.text || `Failed to save preferences (${resp.status})`);
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
  let auth: ServerAuthResponse;
  try {
    const authResp = await httpRequest(`${base}/auth/login`, {
      method: "POST",
      json: { username, password },
    });

    if (!authResp.ok) {
      throw new Error(errorMessageFromHttpResult(authResp));
    }

    auth = authResp.json as ServerAuthResponse;
    if (!auth?.token) throw new Error("Authentication failed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to reach server";
    if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
      if (isLocalhostUrl(base)) {
        throw new Error(
          "Can't reach your server at localhost from Android. Use your LAN IP (e.g. 192.168.x.x) or (on Android emulator) 10.0.2.2 instead.",
        );
      }
      throw new Error(`Failed to reach server. Check the address and that the device can access it. (${base})`);
    }
    throw err;
  }

  const token = auth.token;

  // 2) Derive per-user server key
  const key = await deriveServerKey(password, username);

  // 3) Fetch items
  const itemsResp = await httpRequest(`${base}/vault/items`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!itemsResp.ok) {
    throw new Error(itemsResp.text || "Failed to fetch vault items");
  }

  const items = (itemsResp.json ?? []) as VaultItem[];
  const decrypted = await decryptVaultItems(items, key);

  if (items.length > 0 && decrypted.entries.length === 0 && decrypted.candidateCount > 0) {
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

  const session: ServerSession = {
    serverUrl: base,
    authToken: token,
    serverKey: key,
    username,
  };

  let prefs: VaultSettings | undefined;
  try {
    prefs = await fetchPreferencesFromServer(session);
  } catch {
    prefs = undefined;
  }

  return {
    vault: {
      entries: decrypted.entries,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      settings: {
        ...(decrypted.settings ?? {}),
        ...(prefs ?? {}),
      },
    },
    session,
  };
}
