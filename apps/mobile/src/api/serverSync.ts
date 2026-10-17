import type { VaultEntry } from "@guardian/core/crypto/vault";
import { packBlob } from "@guardian/core/crypto/chacha20";
import { httpRequest } from "./http";

interface ServerItem {
  id: string;
  encrypted_blob: string;
  revision: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function cleanUrl(url: string): string {
  return url.replace(/\/$/, "");
}

async function encryptValue(key: Uint8Array, id: string, value: unknown): Promise<ServerItem> {
  const json = JSON.stringify(value);
  const plaintext = new TextEncoder().encode(json);

  // Wire format: [0x03 marker][24-byte nonce][ciphertext + 16-byte tag]
  const packed = await packBlob(key, plaintext);

  return {
    id,
    encrypted_blob: bytesToBase64(packed),
    revision: 1,
  };
}

/**
 * Encrypt and upsert arbitrary id/value pairs on the server. Used to push
 * entries, and to eagerly re-encrypt legacy (v1/v2) items into the current
 * (v3) format.
 */
export async function pushValuesToServer(
  serverUrl: string,
  authToken: string,
  serverKey: Uint8Array,
  values: { id: string; value: unknown }[],
): Promise<void> {
  if (values.length === 0) return;

  const items: ServerItem[] = [];
  for (const { id, value } of values) {
    items.push(await encryptValue(serverKey, id, value));
  }

  const resp = await httpRequest(`${cleanUrl(serverUrl)}/vault/items`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${authToken}` },
    json: items,
  });

  if (!resp.ok) {
    throw new Error(`Server push failed (${resp.status}): ${resp.text}`);
  }
}

export async function pushEntriesToServer(
  serverUrl: string,
  authToken: string,
  serverKey: Uint8Array,
  entries: VaultEntry[],
): Promise<void> {
  await pushValuesToServer(
    serverUrl,
    authToken,
    serverKey,
    entries.map((entry) => ({ id: entry.id, value: entry })),
  );
}

export async function deleteEntryViaUpsertToServer(
  serverUrl: string,
  authToken: string,
  id: string,
): Promise<void> {
  const resp = await httpRequest(`${cleanUrl(serverUrl)}/vault/items`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${authToken}` },
    json: [{ id, encrypted_blob: "", revision: 0 } satisfies ServerItem],
  });

  if (!resp.ok) {
    throw new Error(`Server delete (via upsert) failed (${resp.status}): ${resp.text}`);
  }
}

export async function deleteEntryFromServer(
  serverUrl: string,
  authToken: string,
  id: string,
): Promise<void> {
  const resp = await httpRequest(`${cleanUrl(serverUrl)}/vault/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });

  // The server delete endpoint is idempotent and returns 200 even if the item is missing.
  // A 404 here usually means the route wasn't found (wrong base URL / proxy), so treat it as an error.
  if (!resp.ok) {
    throw new Error(`Server delete failed (${resp.status}): ${resp.text}`);
  }
}
