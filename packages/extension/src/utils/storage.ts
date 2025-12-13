/**
 * Browser storage utilities for Guardian extension
 * Uses chrome.storage.local to store encrypted vault data
 */

import { createVault, loadVault, createEmptyVault } from "../../../shared/crypto/vault";
import type { VaultEntry } from "../../../shared/crypto/vault";

const VAULT_STORAGE_KEY = "guardian_vault";
const SETTINGS_STORAGE_KEY = "guardian_settings";
const SESSION_STORAGE_KEY = "guardian_session";
const FILE_HANDLE_STORAGE_KEY = "guardian_file_handle";

export interface ExtensionSettings {
  theme?: "dark" | "slate" | "light" | "editor" | "violet";
  accentColor?: "yellow" | "blue" | "green" | "purple" | "pink" | "orange" | "cyan" | "red";
  autoLockMinutes?: number;
}

export interface SessionData {
  vaultFileName: string;
  vaultFileLastModified: number;
  // We don't store master password for security - user must re-enter it
}

export interface FileHandleMetadata {
  fileName: string;
  lastModified: number;
  name: string;
  kind: string;
}

/**
 * Get the Chrome storage API (works for both Chrome and Firefox)
 */
function getStorage(): chrome.storage.StorageArea {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    throw new Error('Chrome storage API is not available. Make sure the extension has storage permission.');
  }
  return chrome.storage.local;
}

/**
 * Save encrypted vault to browser storage
 */
export async function saveVault(masterPassword: string, entries: VaultEntry[]): Promise<void> {
  try {
    const encryptedVault = await createVault(masterPassword, entries);
    
    // Convert Uint8Array to base64 for storage
    const base64Vault = btoa(String.fromCharCode(...encryptedVault));
    
    await getStorage().set({ [VAULT_STORAGE_KEY]: base64Vault });
  } catch (error) {
    console.error("Error saving vault:", error);
    throw new Error("Failed to save vault");
  }
}

/**
 * Load and decrypt vault from browser storage
 */
export async function loadVaultFromStorage(masterPassword: string): Promise<VaultEntry[]> {
  try {
    const result = await getStorage().get(VAULT_STORAGE_KEY);
    const base64Vault = result[VAULT_STORAGE_KEY];
    
    if (!base64Vault) {
      // No vault exists, return empty array
      return [];
    }
    
    // Convert base64 back to Uint8Array
    const binaryString = atob(base64Vault);
    const vaultBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      vaultBytes[i] = binaryString.charCodeAt(i);
    }
    
    const decryptedVault = await loadVault(masterPassword, vaultBytes);
    return decryptedVault.entries;
  } catch (error) {
    console.error("Error loading vault:", error);
    throw new Error("Invalid master password or corrupted vault");
  }
}

/**
 * Check if a vault exists in storage
 */
export async function vaultExists(): Promise<boolean> {
  try {
    const result = await getStorage().get(VAULT_STORAGE_KEY);
    return !!result[VAULT_STORAGE_KEY];
  } catch (error) {
    console.error("Error checking vault existence:", error);
    return false;
  }
}

/**
 * Create a new vault and save it
 */
export async function createNewVault(masterPassword: string): Promise<void> {
  try {
    const emptyVault = createEmptyVault();
    await saveVault(masterPassword, emptyVault.entries);
  } catch (error) {
    console.error("Error creating vault:", error);
    throw new Error("Failed to create vault");
  }
}

/**
 * Delete vault from storage
 */
export async function deleteVault(): Promise<void> {
  try {
    await getStorage().remove(VAULT_STORAGE_KEY);
  } catch (error) {
    console.error("Error deleting vault:", error);
    throw new Error("Failed to delete vault");
  }
}

/**
 * Save extension settings
 */
export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  try {
    const storage = getStorage();
    await storage.set({ [SETTINGS_STORAGE_KEY]: settings });
  } catch (error) {
    // If storage is not available, log warning but don't throw (settings are optional)
    if (error instanceof Error && error.message.includes('storage')) {
      console.warn("Storage API not available. Settings will not be persisted.");
      return;
    }
    console.error("Error saving settings:", error);
    // Don't throw - settings persistence is optional
  }
}

/**
 * Load extension settings
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  try {
    const storage = getStorage();
    const result = await storage.get(SETTINGS_STORAGE_KEY);
    return result[SETTINGS_STORAGE_KEY] || {};
  } catch (error) {
    // If storage is not available (e.g., permission not granted), return empty settings
    if (error instanceof Error && error.message.includes('storage')) {
      console.warn("Storage API not available. Settings will use defaults.");
      return {};
    }
    console.error("Error loading settings:", error);
    return {};
  }
}

/**
 * Save session data (vault file reference)
 */
export async function saveSession(session: SessionData): Promise<void> {
  try {
    const storage = getStorage();
    await storage.set({ [SESSION_STORAGE_KEY]: session });
  } catch (error) {
    console.error("Error saving session:", error);
    // Don't throw - session persistence is optional
  }
}

/**
 * Load session data
 */
export async function loadSession(): Promise<SessionData | null> {
  try {
    const storage = getStorage();
    const result = await storage.get(SESSION_STORAGE_KEY);
    return result[SESSION_STORAGE_KEY] || null;
  } catch (error) {
    console.error("Error loading session:", error);
    return null;
  }
}

/**
 * Clear session data
 */
export async function clearSession(): Promise<void> {
  try {
    const storage = getStorage();
    await storage.remove(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing session:", error);
  }
}

/**
 * Save file handle metadata
 */
export async function saveFileHandleMetadata(metadata: FileHandleMetadata): Promise<void> {
  try {
    const storage = getStorage();
    await storage.set({ [FILE_HANDLE_STORAGE_KEY]: metadata });
  } catch (error) {
    console.error("Error saving file handle metadata:", error);
  }
}

/**
 * Load file handle metadata
 */
export async function loadFileHandleMetadata(): Promise<FileHandleMetadata | null> {
  try {
    const storage = getStorage();
    const result = await storage.get(FILE_HANDLE_STORAGE_KEY);
    return result[FILE_HANDLE_STORAGE_KEY] || null;
  } catch (error) {
    console.error("Error loading file handle metadata:", error);
    return null;
  }
}

/**
 * Clear file handle metadata
 */
export async function clearFileHandleMetadata(): Promise<void> {
  try {
    const storage = getStorage();
    await storage.remove(FILE_HANDLE_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing file handle metadata:", error);
  }
}

