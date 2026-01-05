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

import { deriveKey, deriveKeyLegacy, generateSalt } from './argon2';
import { encrypt, decrypt, generateNonce } from './chacha20';

// Import the fallback function for compatibility
async function deriveKeyPBKDF2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const iterations = 100000;
  const saltBuffer = new Uint8Array(salt).buffer;

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes = 256 bits
  );

  const buffer = derivedBits instanceof ArrayBuffer
    ? derivedBits
    : new Uint8Array(derivedBits).buffer;

  return new Uint8Array(buffer);
}

// Format constants
const MAGIC_HEADER = new TextEncoder().encode('GUARDIAN'); // 8 bytes
const VERSION = 1; // 1 byte
const SALT_LENGTH = 16; // 16 bytes
const NONCE_LENGTH = 12; // 12 bytes
const TAG_LENGTH = 16; // 16 bytes (Poly1305 tag)

export interface VaultSettings {
  theme?: string;
  accentColor?: string;
  viewMode?: "grid" | "table";
  itemSize?: "small" | "medium" | "large";
  clipboardClearSeconds?: number;
  revealCensorSeconds?: number;
}

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
  settings?: VaultSettings;
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
  entries: VaultEntry[],
  settings?: VaultSettings
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
    settings,
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
  // Checks minimum size
  const minSize = MAGIC_HEADER.length + 1 + SALT_LENGTH + NONCE_LENGTH + TAG_LENGTH;
  if (vaultData.length < minSize) {
    throw new Error('Invalid vault format: file too short');
  }

  // Bytes 0-7: Verifies the magic header "GUARDIAN"
  const magic = new TextDecoder().decode(vaultData.slice(0, MAGIC_HEADER.length));
  if (magic !== 'GUARDIAN') {
    throw new Error('Invalid vault format: incorrect magic header');
  }

  // Byte 8: Reads the version
  const version = vaultData[8];
  if (version !== VERSION) {
    throw new Error(`Unsupported vault version: ${version}. Expected version: ${VERSION}`);
  }

  // Bytes 9-24: Reads the salt (16 bytes)
  const salt = new Uint8Array(vaultData.slice(9, 9 + SALT_LENGTH));

  // Bytes 25-36: Reads the nonce (12 bytes)
  const nonce = new Uint8Array(vaultData.slice(25, 25 + NONCE_LENGTH));

  // Bytes 37+: Reads the ciphertext + tag
  const ciphertextWithTag = vaultData.slice(37);

  // Helper function to attempt decryption with a given key derivation function
  const tryDecrypt = async (deriveKeyFn: (password: string, salt: Uint8Array) => Promise<Uint8Array>): Promise<VaultData> => {
    const key = await deriveKeyFn(password, salt);
    const plaintext = await decrypt(key, nonce, ciphertextWithTag);
    const decryptedString = new TextDecoder().decode(plaintext);
    let data: VaultData;
    try {
      data = JSON.parse(decryptedString) as VaultData;
    } catch (parseError) {
      throw new Error('Decrypted data is not valid JSON');
    }

    // Handle legacy vault format where entries was incorrectly nested
    if (data.entries && typeof data.entries === 'object' && !Array.isArray(data.entries)) {
      const nestedData = data.entries as any;
      if (nestedData.entries && Array.isArray(nestedData.entries)) {
        data = {
          entries: nestedData.entries,
          createdAt: nestedData.createdAt || data.createdAt || new Date().toISOString(),
          lastModified: nestedData.lastModified || data.lastModified || new Date().toISOString()
        };
      }
    }

    if (!data.entries || !Array.isArray(data.entries) || !data.createdAt || !data.lastModified) {
      throw new Error('Invalid vault format: incorrect data structure');
    }

    return data;
  };

  // Helper function to check if an error is an authentication/decryption error
  const isAuthOrDecryptError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const message = error.message;
    return (
      message.includes('Authentication failed') ||
      message.includes('Decrypted data is not valid JSON') ||
      message.includes('Invalid vault format: incorrect data structure')
    );
  };

  // Try 1: Argon2id with current parameters (32 MiB)
  try {
    return await tryDecrypt(deriveKey);
  } catch (error) {
    // If it's not an authentication/decryption error, re-throw immediately
    if (!isAuthOrDecryptError(error)) {
      throw error;
    }
    // Otherwise, continue to try legacy parameters
  }

  // Try 2: Argon2id with legacy parameters (64 MiB) for backward compatibility
  try {
    return await tryDecrypt(deriveKeyLegacy);
  } catch (error) {
    // If it's not an authentication/decryption error, re-throw immediately
    if (!isAuthOrDecryptError(error)) {
      throw error;
    }
    // Otherwise, continue to PBKDF2 fallback
  }

  // Try 3: PBKDF2 fallback (for very old vaults that were encrypted with PBKDF2)
  try {
    return await tryDecrypt(deriveKeyPBKDF2);
  } catch (error) {
    throw new Error('Authentication failed: Invalid master password or corrupted vault file.');
  }
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
