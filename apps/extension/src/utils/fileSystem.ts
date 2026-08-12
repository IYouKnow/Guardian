/**
 * File System Access API utilities for Guardian extension
 * Handles file selection and reading using File System Access API (Chrome/Edge)
 * Falls back to traditional file input for other browsers
 */

const DB_NAME = 'GuardianFileDB';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'vault_handle';

/**
 * IndexedDB helper to store non-serializable FileSystemHandle
 */
async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getStoredHandle(): Promise<FileSystemFileHandle | undefined> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || undefined);
    request.onerror = () => reject(request.error);
  });
}

async function removeStoredHandle(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Check if File System Access API is available
export function isFileSystemAccessAvailable(): boolean {
  return 'showOpenFilePicker' in window && 'FileSystemHandle' in window;
}

/**
 * Select a vault file using File System Access API
 * Returns the file handle and file data
 */
export async function selectVaultFile(): Promise<{
  handle: FileSystemFileHandle;
  file: File;
}> {
  if (!isFileSystemAccessAvailable()) {
    throw new Error('File System Access API is not available');
  }

  try {
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'Guardian Vault Files',
          accept: {
            'application/octet-stream': ['.guardian'],
          },
        },
      ],
      excludeAcceptAllOption: false,
      multiple: false,
    });

    const file = await fileHandle.getFile();
    return { handle: fileHandle, file };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('File selection cancelled');
    }
    throw err;
  }
}

/**
 * Read file from saved handle
 */
export async function readFileFromHandle(
  handle: FileSystemFileHandle
): Promise<File> {
  try {
    // Verify permission
    const permissionStatus = await (handle as any).queryPermission({ mode: 'read' });
    if (permissionStatus !== 'granted') {
      // Request permission
      const newPermission = await (handle as any).requestPermission({ mode: 'read' });
      if (newPermission !== 'granted') {
        throw new Error('Permission denied to read file');
      }
    }

    return await handle.getFile();
  } catch (err) {
    console.error('Error reading file from handle:', err);
    throw new Error('Failed to read file. Please select it again.');
  }
}

/**
 * Get file metadata (lastModified) from handle
 */
export async function getFileMetadata(
  handle: FileSystemFileHandle
): Promise<{ lastModified: number; name: string }> {
  try {
    const file = await readFileFromHandle(handle);
    return {
      lastModified: file.lastModified,
      name: file.name,
    };
  } catch (err) {
    console.error('Error getting file metadata:', err);
    throw err;
  }
}

// Global storage for file handles (in-memory, session-only)
// FileSystemHandle cannot be serialized, but it CAN be stored in IndexedDB
const fileHandleStore = new Map<string, FileSystemFileHandle>();
const FILE_HANDLE_ID = 'guardian_vault_handle';

/**
 * Save file handle (stores in memory, IndexedDB and metadata in chrome.storage)
 */
export async function saveFileHandle(
  handle: FileSystemFileHandle
): Promise<void> {
  try {
    // Store handle in memory
    fileHandleStore.set(FILE_HANDLE_ID, handle);

    // Also store in window object as backup (for same window)
    (window as any).__guardianFileHandle = handle;

    // Store in IndexedDB for persistence across closures
    await storeHandle(handle);

    // Store metadata in chrome.storage for reference
    const file = await handle.getFile();
    await chrome.storage.local.set({
      [FILE_HANDLE_ID]: {
        fileName: file.name,
        lastModified: file.lastModified,
        name: handle.name,
        kind: handle.kind,
      },
    });
  } catch (err) {
    console.error('Error saving file handle:', err);
    throw err;
  }
}

/**
 * Load file handle from IndexedDB or memory
 */
export async function loadFileHandle(): Promise<{
  handle: FileSystemFileHandle | null;
  metadata: { fileName: string; lastModified: number } | null;
}> {
  try {
    // Try to get handle from memory store
    let handle = fileHandleStore.get(FILE_HANDLE_ID);

    // Try window object as backup
    if (!handle && (window as any).__guardianFileHandle) {
      handle = (window as any).__guardianFileHandle;
    }

    // Try IndexedDB
    if (!handle) {
      handle = await getStoredHandle();
    }

    if (handle) {
      try {
        console.log('loadFileHandle: Found handle in store/IndexedDB');
        // We still store it in memory for quick access
        fileHandleStore.set(FILE_HANDLE_ID, handle as any);

        const file = await handle.getFile();
        console.log('loadFileHandle: Successfully got file from handle, lastModified:', file.lastModified);
        return {
          handle,
          metadata: {
            fileName: file.name,
            lastModified: file.lastModified,
          },
        };
      } catch (err: any) {
        // Distinguish between permission error and fatal error
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          console.warn('loadFileHandle: Handle exists but permission is currently denied. Keeping handle.');
          // Don't remove the handle, just return it without fresh metadata
          // The metadata from storage will be used below
        } else {
          console.error('loadFileHandle: Fatal error with handle, removing it:', err);
          fileHandleStore.delete(FILE_HANDLE_ID);
          delete (window as any).__guardianFileHandle;
          await removeStoredHandle();
        }
      }
    }

    // Get metadata from chrome.storage (for showing last used file name)
    const result = await chrome.storage.local.get(FILE_HANDLE_ID);
    const metadata = result[FILE_HANDLE_ID];
    console.log('loadFileHandle: Returning with handle', !!handle, 'and metadata', !!metadata);

    if (metadata) {
      return {
        handle: handle || null,
        metadata: {
          fileName: metadata.fileName,
          lastModified: metadata.lastModified,
        },
      };
    }

    return { handle: handle || null, metadata: null };
  } catch (err) {
    console.error('Error loading file handle:', err);
    return { handle: null, metadata: null };
  }
}

/**
 * Clear saved file handle
 */
export async function clearFileHandle(): Promise<void> {
  try {
    fileHandleStore.delete(FILE_HANDLE_ID);
    delete (window as any).__guardianFileHandle;
    await removeStoredHandle();
    await chrome.storage.local.remove(FILE_HANDLE_ID);
  } catch (err) {
    console.error('Error clearing file handle:', err);
  }
}

