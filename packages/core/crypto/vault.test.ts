import { describe, it, expect } from 'vitest';
import { createVault, openVault, createVaultWithKey, openVaultWithKey } from './vault';
import type { VaultEntry } from './vault';
import { deriveKey, generateSalt } from './argon2';
import { encrypt, generateNonce } from './chacha20';

const entry: VaultEntry = {
  id: '1',
  name: 'Example',
  username: 'user',
  password: 'hunter2',
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString(),
};

const MAGIC = new TextEncoder().encode('GUARDIAN');

// Assembles a .guardian file by hand: [magic][version][salt][nonce][body].
function assembleVault(
  version: number,
  salt: Uint8Array,
  nonce: Uint8Array,
  body: Uint8Array
): Uint8Array {
  const out = new Uint8Array(MAGIC.length + 1 + salt.length + nonce.length + body.length);
  out.set(MAGIC, 0);
  out[8] = version;
  out.set(salt, 9);
  out.set(nonce, 9 + salt.length);
  out.set(body, 9 + salt.length + nonce.length);
  return out;
}

function vaultJson(): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      entries: [entry],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    })
  );
}

describe('.guardian vault format', () => {
  it('round-trips entries through createVault/openVault', async () => {
    const vault = await createVault('master password', [entry]);
    const data = await openVault('master password', vault);
    expect(data.entries).toEqual([entry]);
  });

  it('writes version 3 with a 24-byte nonce', async () => {
    const vault = await createVault('master password', [entry]);
    expect(vault[8]).toBe(3);
    // magic (8) + version (1) + salt (16) + nonce (24) + tag (16)
    expect(vault.length).toBeGreaterThanOrEqual(8 + 1 + 16 + 24 + 16);
  });

  it('rejects the wrong master password', async () => {
    const vault = await createVault('master password', [entry]);
    await expect(openVault('wrong password', vault)).rejects.toThrow();
  });

  it('round-trips through createVaultWithKey/openVaultWithKey', async () => {
    const key = new Uint8Array(32).fill(7);
    const vault = await createVaultWithKey(key, [entry]);
    const data = await openVaultWithKey(key, vault);
    expect(data.entries).toEqual([entry]);
  });

  it('reads a v2 vault (12-byte nonce, ChaCha20-Poly1305)', async () => {
    const password = 'master password';
    const salt = generateSalt();
    const nonce = generateNonce();
    const key = await deriveKey(password, salt);
    const body = await encrypt(key, nonce, vaultJson());

    const vault = assembleVault(2, salt, nonce, body);
    const data = await openVault(password, vault);
    expect(data.entries).toEqual([entry]);
  });

  it('reads a v1 vault (broken tag, recovered via raw ChaCha20)', async () => {
    const password = 'master password';
    const salt = generateSalt();
    const nonce = generateNonce();
    const key = await deriveKey(password, salt);

    // v1 ciphertext is the same RFC-correct stream; only the tag was broken.
    const withTag = await encrypt(key, nonce, vaultJson());
    const ciphertext = withTag.subarray(0, withTag.length - 16);
    const body = new Uint8Array(ciphertext.length + 16);
    body.set(ciphertext, 0);
    body.set(new Uint8Array(16).fill(0xab), ciphertext.length);

    const vault = assembleVault(1, salt, nonce, body);
    const data = await openVault(password, vault);
    expect(data.entries).toEqual([entry]);
  });

  it('rejects an unsupported vault version', async () => {
    const salt = generateSalt();
    const nonce = generateNonce();
    const vault = assembleVault(9, salt, nonce, new Uint8Array(16).fill(0));
    await expect(openVault('master password', vault)).rejects.toThrow(/Unsupported vault version/);
  });
});
