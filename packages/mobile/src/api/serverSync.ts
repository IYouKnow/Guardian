import type { VaultEntry } from "../../../shared/crypto/vault";
import { encrypt, generateNonce } from "../../../shared/crypto/chacha20";

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

export async function deleteEntryFromServer(
  serverUrl: string,
  authToken: string,
  id: string,
): Promise<void> {
  const resp = await fetch(`${cleanUrl(serverUrl)}/vault/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!resp.ok && resp.status !== 404) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Server delete failed (${resp.status}): ${body}`);
  }
}

