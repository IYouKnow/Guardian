/**
 * Server-mode vault sync helpers.
 *
 * Encrypts individual vault items with the user's server-side key and
 * PUTs or DELETEs them against the Guardian server.
 *
 * These are pure functions — no React state, no chrome.* APIs — so they
 * can be called from both the popup (`App.tsx`) and the background
 * service worker.
 */

import type { VaultEntry } from "@guardian/core/crypto/vault";
import { packBlob } from "@guardian/core/crypto/chacha20";

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
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function cleanUrl(url: string): string {
  return url.replace(/\/$/, "");
}

async function encryptValue(
  key: Uint8Array,
  id: string,
  value: unknown,
): Promise<ServerItem> {
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

  const resp = await fetch(`${cleanUrl(serverUrl)}/vault/items`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(items),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Server push failed (${resp.status}): ${body}`);
  }
}

/**
 * Encrypt and upsert the given entries on the server. Used for both
 * single-item updates (pass one entry) and bulk saves.
 */
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

/**
 * Delete a single vault item on the server. Idempotent — a 404/no-op on
 * the server is treated as success.
 */
export async function deleteEntryFromServer(
  serverUrl: string,
  authToken: string,
  id: string,
): Promise<void> {
  const resp = await fetch(
    `${cleanUrl(serverUrl)}/vault/items/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );

  if (!resp.ok && resp.status !== 404) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Server delete failed (${resp.status}): ${body}`);
  }
}
