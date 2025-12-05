/**
 * Vault - Binary .guardian format
 * 
 * .guardian file format:
 * - Bytes 0-7: "GUARDIAN" (ASCII, 8 bytes)
 * - Byte 8: version (1 byte, value: 1)
 * - Bytes 9-24: random salt (16 bytes)
 * - Bytes 25-36: nonce (12 bytes)
 * - Bytes 37+: ciphertext + Poly1305 tag (16 bytes)
 * 
 * Encrypted data is a JSON with:
 * {
 *   entries: [],
 *   createdAt: string (ISO 8601),
 *   lastModified: string (ISO 8601)
 * }
 */

import { deriveKey, generateSalt } from './argon2';
import { encrypt, decrypt, generateNonce } from './chacha20';

// Format constants
const MAGIC_HEADER = new TextEncoder().encode('GUARDIAN'); // 8 bytes
const VERSION = 1; // 1 byte
const SALT_LENGTH = 16; // 16 bytes
const NONCE_LENGTH = 12; // 12 bytes
const TAG_LENGTH = 16; // 16 bytes (Poly1305 tag)

export interface VaultEntry {
  id: string;
  name: string;
  username?: string;
  password: string;
  url?: string;
  notes?: string;
  createdAt: string;
  lastModified: string;
}

export interface VaultData {
  entries: VaultEntry[];
  createdAt: string;
  lastModified: string;
}

/**
 * Creates an encrypted vault in binary .guardian format
 * 
 * @param password - Master password to derive the key
 * @param entries - Array of vault entries
 * @returns Encrypted vault as Uint8Array
 */
export async function createVault(
  password: string,
  entries: VaultEntry[]
): Promise<Uint8Array> {
  // Generates random salt and nonce
  const salt = generateSalt();
  const nonce = generateNonce();
  
  // Derives the key using Argon2id
  const key = await deriveKey(password, salt);
  
  // Prepares data for encryption
  const data: VaultData = {
    entries: entries,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
  
  const jsonData = JSON.stringify(data);
  const plaintext = new TextEncoder().encode(jsonData);
  
  // Encrypts data using ChaCha20-Poly1305
  // The encrypt function returns ciphertext + tag (16 bytes) concatenated
  const ciphertextWithTag = await encrypt(key, nonce, plaintext);
  
  // Constructs the binary .guardian format
  // Total size: 8 (magic) + 1 (version) + 16 (salt) + 12 (nonce) + ciphertextWithTag.length
  const vault = new Uint8Array(
    MAGIC_HEADER.length + 1 + SALT_LENGTH + NONCE_LENGTH + ciphertextWithTag.length
  );
  
  let offset = 0;
  
  // Bytes 0-7: "GUARDIAN"
  vault.set(MAGIC_HEADER, offset);
  offset += MAGIC_HEADER.length;
  
  // Byte 8: version
  vault[offset] = VERSION;
  offset += 1;
  
  // Bytes 9-24: salt (16 bytes)
  vault.set(salt, offset);
  offset += SALT_LENGTH;
  
  // Bytes 25-36: nonce (12 bytes)
  vault.set(nonce, offset);
  offset += NONCE_LENGTH;
  
  // Bytes 37+: ciphertext + tag (16 bytes)
  vault.set(ciphertextWithTag, offset);
  
  return vault;
}

/**
 * Opens and decrypts a vault in binary .guardian format
 * 
 * @param password - Master password to derive the key
 * @param vaultData - Binary vault data
 * @returns Decrypted vault data
 */
export async function openVault(
  password: string,
  vaultData: Uint8Array
): Promise<VaultData> {
  let offset = 0;
  
  // Checks minimum size
  const minSize = MAGIC_HEADER.length + 1 + SALT_LENGTH + NONCE_LENGTH + TAG_LENGTH;
  if (vaultData.length < minSize) {
    throw new Error('Invalid vault format: file too short');
  }
  
  // Bytes 0-7: Verifies the magic header "GUARDIAN"
  const magic = vaultData.slice(offset, offset + MAGIC_HEADER.length);
  if (!magic.every((byte, i) => byte === MAGIC_HEADER[i])) {
    throw new Error('Invalid vault format: incorrect magic header');
  }
  offset += MAGIC_HEADER.length;
  
  // Byte 8: Reads the version
  const version = vaultData[offset];
  offset += 1;
  
  if (version !== VERSION) {
    throw new Error(`Unsupported vault version: ${version}. Expected version: ${VERSION}`);
  }
  
  // Bytes 9-24: Reads the salt (16 bytes)
  const salt = vaultData.slice(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;
  
  // Bytes 25-36: Reads the nonce (12 bytes)
  const nonce = vaultData.slice(offset, offset + NONCE_LENGTH);
  offset += NONCE_LENGTH;
  
  // Bytes 37+: Reads the ciphertext + tag
  const ciphertextWithTag = vaultData.slice(offset);
  
  // Derives the key using Argon2id
  const key = await deriveKey(password, salt);
  
  // Decrypts data using ChaCha20-Poly1305
  // The decrypt function expects ciphertext + tag (16 bytes) concatenated
  const plaintext = await decrypt(key, nonce, ciphertextWithTag);
  
  // Parses JSON
  const jsonString = new TextDecoder().decode(plaintext);
  const data = JSON.parse(jsonString) as VaultData;
  
  // Validates data structure
  if (!data.entries || !Array.isArray(data.entries)) {
    throw new Error('Invalid vault format: incorrect data structure');
  }
  
  if (!data.createdAt || !data.lastModified) {
    throw new Error('Invalid vault format: missing date fields');
  }
  
  return data;
}

/**
 * Alias for openVault - maintains compatibility with existing code
 */
export const loadVault = openVault;

/**
 * Creates empty vault data
 */
export function createEmptyVault(): VaultData {
  return {
    entries: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
}
