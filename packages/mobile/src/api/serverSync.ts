import type { VaultEntry } from "@guardian/shared/crypto/vault";
import { encrypt, generateNonce } from "@guardian/shared/crypto/chacha20";
import { httpRequest } from "./http";

interface ServerItem {
  id: string;
  encrypted_blob: string;
  revision: number;
}

function cleanUrl(url: string): string {
  return url.replace(/\/$/, "");
}

async function encryptEntry(key: Uint8Array, entry: VaultEntry): Promise<ServerItem> {
  const json = JSON.stringify(entry);
  const plaintext = new TextEncoder().encode(json);
  const nonce = generateNonce();
  const ciphertext = await encrypt(key, nonce, plaintext);

  const packed = new Uint8Array(nonce.length + ciphertext.length);
  packed.set(nonce, 0);
  packed.set(ciphertext, nonce.length);

  return {
    id: entry.id,
    encrypted_blob: btoa(String.fromCharCode(...packed)),
    revision: 1,
  };
}

export async function pushEntriesToServer(
  serverUrl: string,
  authToken: string,
  serverKey: Uint8Array,
  entries: VaultEntry[],
): Promise<void> {
  if (entries.length === 0) return;

  const items: ServerItem[] = [];
  for (const entry of entries) {
    items.push(await encryptEntry(serverKey, entry));
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
