/**
 * Vault - Binary .guardian format
 * 
 * .guardian file format (current version 3):
 * - Bytes 0-7: "GUARDIAN" (ASCII, 8 bytes)
 * - Byte 8: version (1 byte). Current version is 3.
 * - Bytes 9-24: random salt (16 bytes)
 * - Bytes 25-48: nonce (24 bytes)
 * - Bytes 49+: ciphertext + Poly1305 tag (16 bytes)
 *
 * Version 3 uses XChaCha20-Poly1305 with a 24-byte nonce. Version 2 used
 * ChaCha20-Poly1305 with a 12-byte nonce (nonce at 25-36, ciphertext at 37+).
 *
 * Version 1 was written with a broken Poly1305 tag that provided no
 * authentication. Those files are still readable: they are recovered with raw
 * ChaCha20 and transparently re-encrypted as the current version on the next save.
 * 
 * Encrypted data is a JSON with:
 * {
 *   entries: [],
 *   createdAt: string (ISO 8601),
 *   lastModified: string (ISO 8601)
 * }
 */

import { deriveKey, generateSalt } from './argon2';
import {
  encryptXChaCha,
  decryptXChaCha,
  decrypt,
  decryptLegacy,
  generateXNonce,
} from './chacha20';

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

  const iterations = 600000;
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
const VERSION = 3; // 1 byte, XChaCha20-Poly1305, 24-byte nonce
const LEGACY_AEAD_VERSION = 2; // ChaCha20-Poly1305, 12-byte nonce
const LEGACY_VERSION = 1; // broken-tag format, readable via recovery
const SALT_LENGTH = 16; // 16 bytes
const NONCE_LENGTH = 12; // 12 bytes (v1/v2)
const XCHACHA_NONCE_LENGTH = 24; // 24 bytes (v3)
const TAG_LENGTH = 16; // 16 bytes (Poly1305 tag)

// Byte offsets of the salt/nonce/body in the fixed header.
const SALT_OFFSET = 9;
const NONCE_OFFSET = SALT_OFFSET + SALT_LENGTH; // 25

// Minimum file sizes (magic + version + salt + nonce + tag).
const MIN_V1V2_SIZE = 8 + 1 + SALT_LENGTH + NONCE_LENGTH + TAG_LENGTH; // 53
const MIN_V3_SIZE = 8 + 1 + SALT_LENGTH + XCHACHA_NONCE_LENGTH + TAG_LENGTH; // 65

export interface VaultSettings {
  theme?: string;
  accentColor?: string;
  viewMode?: "grid" | "table";
  itemSize?: "small" | "medium" | "large";
  clipboardClearSeconds?: number;
  revealCensorSeconds?: number;
  syncTheme?: boolean;
  customFieldTemplates?: { name: string; type: string }[];
  keybinds?: Record<string, { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }>;
}

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  order?: number;
  icon?: string;
}

export interface CustomField {
  name: string;
  value: string;
  type: string;
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
  // Optional page favicon or native app icon captured at save time, stored as a data URL
  // so the client can render it without making cross-origin requests or
  // leaking the user's password list to an external service.
  favicon?: string;
  folderId?: string;
  order?: number;
  customFields?: CustomField[];
}

export interface VaultData {
  entries: VaultEntry[];
  createdAt: string;
  lastModified: string;
  settings?: VaultSettings;
  folders?: FolderNode[];
}

/**
 * Assembles the binary .guardian container from its parts.
 * Layout: [magic 8][version 1][salt 16][nonce 24][ciphertext + tag]
 */
function packVaultFile(
  salt: Uint8Array,
  nonce: Uint8Array,
  ciphertextWithTag: Uint8Array
): Uint8Array {
  const vault = new Uint8Array(
    MAGIC_HEADER.length + 1 + SALT_LENGTH + XCHACHA_NONCE_LENGTH + ciphertextWithTag.length
  );

  let offset = 0;
  vault.set(MAGIC_HEADER, offset);
  offset += MAGIC_HEADER.length;
  vault[offset] = VERSION;
  offset += 1;
  vault.set(salt, offset);
  offset += SALT_LENGTH;
  vault.set(nonce, offset);
  offset += XCHACHA_NONCE_LENGTH;
  vault.set(ciphertextWithTag, offset);

  return vault;
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
  settings?: VaultSettings,
  folders?: FolderNode[]
): Promise<Uint8Array> {
  // Generates random salt and nonce
  const salt = generateSalt();
  const nonce = generateXNonce();

  // Derives the key using Argon2id
  const key = await deriveKey(password, salt);

  // Prepares data for encryption
  const data: VaultData = {
    entries: entries,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    settings,
    folders,
  };

  const jsonData = JSON.stringify(data);
  const plaintext = new TextEncoder().encode(jsonData);

  // Encrypts data using XChaCha20-Poly1305 (ciphertext + 16-byte tag)
  const ciphertextWithTag = await encryptXChaCha(key, nonce, plaintext);

  return packVaultFile(salt, nonce, ciphertextWithTag);
}

/**
 * Creates an encrypted vault in binary .guardian format using a pre-derived symmetric key
 * 
 * @param key - 32-byte symmetric key for XChaCha20 encryption
 * @param entries - Array of vault entries
 * @returns Encrypted vault as Uint8Array
 */
export async function createVaultWithKey(
  key: Uint8Array,
  entries: VaultEntry[],
  settings?: VaultSettings,
  folders?: FolderNode[]
): Promise<Uint8Array> {
  // Generates random salt and nonce
  const salt = generateSalt();
  const nonce = generateXNonce();

  // Prepares data for encryption
  const data: VaultData = {
    entries: entries,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    settings,
    folders,
  };

  const jsonData = JSON.stringify(data);
  const plaintext = new TextEncoder().encode(jsonData);

  // Encrypts data using XChaCha20-Poly1305
  const ciphertextWithTag = await encryptXChaCha(key, nonce, plaintext);

  return packVaultFile(salt, nonce, ciphertextWithTag);
}

type VaultCipher = (
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array
) => Promise<Uint8Array>;

interface ParsedVaultFile {
  version: number;
  salt: Uint8Array;
  nonce: Uint8Array;
  ciphertextWithTag: Uint8Array;
  cipher: VaultCipher;
}

/**
 * Validates the fixed .guardian header and extracts the salt, nonce, body and
 * the version-appropriate cipher. Supports v3 (XChaCha20-Poly1305, 24-byte
 * nonce), v2 (ChaCha20-Poly1305, 12-byte nonce) and v1 (broken-tag recovery).
 */
function parseVaultHeader(vaultData: Uint8Array): ParsedVaultFile {
  if (vaultData.length < MIN_V1V2_SIZE) {
    throw new Error('Invalid vault format: file too short');
  }

  // Bytes 0-7: Verifies the magic header "GUARDIAN"
  const magic = new TextDecoder().decode(vaultData.slice(0, MAGIC_HEADER.length));
  if (magic !== 'GUARDIAN') {
    throw new Error('Invalid vault format: incorrect magic header');
  }

  // Byte 8: Reads the version
  const version = vaultData[8];
  if (version !== VERSION && version !== LEGACY_AEAD_VERSION && version !== LEGACY_VERSION) {
    throw new Error(`Unsupported vault version: ${version}. Expected version: ${VERSION}.`);
  }

  const isV3 = version === VERSION;
  const nonceLength = isV3 ? XCHACHA_NONCE_LENGTH : NONCE_LENGTH;
  const minSize = isV3 ? MIN_V3_SIZE : MIN_V1V2_SIZE;
  if (vaultData.length < minSize) {
    throw new Error('Invalid vault format: file too short');
  }

  const salt = new Uint8Array(vaultData.slice(SALT_OFFSET, SALT_OFFSET + SALT_LENGTH));
  const nonce = new Uint8Array(vaultData.slice(NONCE_OFFSET, NONCE_OFFSET + nonceLength));
  const ciphertextWithTag = vaultData.slice(NONCE_OFFSET + nonceLength);

  // v1 vaults used the old broken-tag format; recover their plaintext with raw
  // ChaCha20 (the old tag authenticated nothing). They are re-encrypted as the
  // current version the next time the vault is saved.
  let cipher: VaultCipher;
  if (isV3) {
    cipher = decryptXChaCha;
  } else if (version === LEGACY_VERSION) {
    cipher = async (key, n, data) => decryptLegacy(key, n, data);
  } else {
    cipher = decrypt;
  }

  return { version, salt, nonce, ciphertextWithTag, cipher };
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
  const { version, salt, nonce, ciphertextWithTag, cipher } = parseVaultHeader(vaultData);

  // Helper function to attempt decryption with a given key derivation function
  const tryDecrypt = async (deriveKeyFn: (password: string, salt: Uint8Array) => Promise<Uint8Array>): Promise<VaultData> => {
    const key = await deriveKeyFn(password, salt);
    const plaintext = await cipher(key, nonce, ciphertextWithTag);
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

  // v2/v3 vaults only ever use the current Argon2id parameters. v1 vaults may
  // predate those parameters, so fall back through the legacy KDFs.
  const kdfAttempts = version === LEGACY_VERSION
    ? [deriveKey, deriveKeyPBKDF2]
    : [deriveKey];

  for (const deriveKeyFn of kdfAttempts) {
    try {
      return await tryDecrypt(deriveKeyFn);
    } catch (error) {
      // If it's not an authentication/decryption error, re-throw immediately
      if (!isAuthOrDecryptError(error)) {
        throw error;
      }
      // Otherwise, continue to the next key derivation function
    }
  }

  throw new Error('Authentication failed: Invalid master password or corrupted vault file.');
}

/**
 * Opens and decrypts a vault in binary .guardian format using a pre-derived symmetric key
 * 
 * @param key - 32-byte symmetric key for ChaCha20 decryption
 * @param vaultData - Binary vault data
 * @returns Decrypted vault data
 */
export async function openVaultWithKey(
  key: Uint8Array,
  vaultData: Uint8Array
): Promise<VaultData> {
  const { nonce, ciphertextWithTag, cipher } = parseVaultHeader(vaultData);

  try {
    const plaintext = await cipher(key, nonce, ciphertextWithTag);
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
  } catch (error) {
    throw new Error('Authentication failed: Invalid key or corrupted vault file.');
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
