/**
 * Vault - Formato binário .guardian
 * 
 * Formato do arquivo .guardian:
 * - Bytes 0-7: "GUARDIAN" (ASCII, 8 bytes)
 * - Byte 8: versão (1 byte, valor: 1)
 * - Bytes 9-24: salt aleatório (16 bytes)
 * - Bytes 25-36: nonce (12 bytes)
 * - Bytes 37+: ciphertext + Poly1305 tag (16 bytes)
 * 
 * Os dados encriptados são um JSON com:
 * {
 *   entries: [],
 *   createdAt: string (ISO 8601),
 *   lastModified: string (ISO 8601)
 * }
 */

import { deriveKey, generateSalt } from './argon2';
import { encrypt, decrypt, generateNonce } from './chacha20';

// Constantes do formato
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
 * Cria um vault encriptado no formato binário .guardian
 * 
 * @param password - Senha mestra para derivar a chave
 * @param entries - Array de entradas do vault
 * @returns Vault encriptado como Uint8Array
 */
export async function createVault(
  password: string,
  entries: VaultEntry[]
): Promise<Uint8Array> {
  // Gera salt e nonce aleatórios
  const salt = generateSalt();
  const nonce = generateNonce();
  
  // Deriva a chave usando Argon2id
  const key = await deriveKey(password, salt);
  
  // Prepara os dados para encriptar
  const data: VaultData = {
    entries: entries,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
  
  const jsonData = JSON.stringify(data);
  const plaintext = new TextEncoder().encode(jsonData);
  
  // Encripta os dados usando ChaCha20-Poly1305
  // A função encrypt retorna ciphertext + tag (16 bytes) concatenados
  const ciphertextWithTag = await encrypt(key, nonce, plaintext);
  
  // Constrói o formato binário .guardian
  // Tamanho total: 8 (magic) + 1 (version) + 16 (salt) + 12 (nonce) + ciphertextWithTag.length
  const vault = new Uint8Array(
    MAGIC_HEADER.length + 1 + SALT_LENGTH + NONCE_LENGTH + ciphertextWithTag.length
  );
  
  let offset = 0;
  
  // Bytes 0-7: "GUARDIAN"
  vault.set(MAGIC_HEADER, offset);
  offset += MAGIC_HEADER.length;
  
  // Byte 8: versão
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
 * Abre e desencripta um vault no formato binário .guardian
 * 
 * @param password - Senha mestra para derivar a chave
 * @param vaultData - Dados binários do vault
 * @returns Dados desencriptados do vault
 */
export async function openVault(
  password: string,
  vaultData: Uint8Array
): Promise<VaultData> {
  let offset = 0;
  
  // Verifica o tamanho mínimo
  const minSize = MAGIC_HEADER.length + 1 + SALT_LENGTH + NONCE_LENGTH + TAG_LENGTH;
  if (vaultData.length < minSize) {
    throw new Error('Formato de vault inválido: arquivo muito curto');
  }
  
  // Bytes 0-7: Verifica o magic header "GUARDIAN"
  const magic = vaultData.slice(offset, offset + MAGIC_HEADER.length);
  if (!magic.every((byte, i) => byte === MAGIC_HEADER[i])) {
    throw new Error('Formato de vault inválido: magic header incorreto');
  }
  offset += MAGIC_HEADER.length;
  
  // Byte 8: Lê a versão
  const version = vaultData[offset];
  offset += 1;
  
  if (version !== VERSION) {
    throw new Error(`Versão de vault não suportada: ${version}. Versão esperada: ${VERSION}`);
  }
  
  // Bytes 9-24: Lê o salt (16 bytes)
  const salt = vaultData.slice(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;
  
  // Bytes 25-36: Lê o nonce (12 bytes)
  const nonce = vaultData.slice(offset, offset + NONCE_LENGTH);
  offset += NONCE_LENGTH;
  
  // Bytes 37+: Lê o ciphertext + tag
  const ciphertextWithTag = vaultData.slice(offset);
  
  // Deriva a chave usando Argon2id
  const key = await deriveKey(password, salt);
  
  // Desencripta os dados usando ChaCha20-Poly1305
  // A função decrypt espera ciphertext + tag (16 bytes) concatenados
  const plaintext = await decrypt(key, nonce, ciphertextWithTag);
  
  // Parse do JSON
  const jsonString = new TextDecoder().decode(plaintext);
  const data = JSON.parse(jsonString) as VaultData;
  
  // Valida a estrutura dos dados
  if (!data.entries || !Array.isArray(data.entries)) {
    throw new Error('Formato de vault inválido: estrutura de dados incorreta');
  }
  
  if (!data.createdAt || !data.lastModified) {
    throw new Error('Formato de vault inválido: campos de data ausentes');
  }
  
  return data;
}

/**
 * Alias para openVault - mantém compatibilidade com código existente
 */
export const loadVault = openVault;

/**
 * Cria dados de vault vazios
 */
export function createEmptyVault(): VaultData {
  return {
    entries: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
}
