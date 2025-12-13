/**
 * File System Access API utilities for Guardian extension
 * Handles file selection and reading using File System Access API (Chrome/Edge)
 * Falls back to traditional file input for other browsers
 */

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
    const permissionStatus = await handle.queryPermission({ mode: 'read' });
    if (permissionStatus !== 'granted') {
      // Request permission
      const newPermission = await handle.requestPermission({ mode: 'read' });
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
// FileSystemHandle cannot be serialized, so we store it in memory during the session
const fileHandleStore = new Map<string, FileSystemFileHandle>();
const FILE_HANDLE_ID = 'guardian_vault_handle';

/**
 * Save file handle (stores in memory and metadata in chrome.storage)
 * Note: FileSystemHandle cannot be serialized, so it's only stored in memory during the session
 */
export async function saveFileHandle(
  handle: FileSystemFileHandle
): Promise<void> {
  try {
    // Store handle in memory
    fileHandleStore.set(FILE_HANDLE_ID, handle);
    
    // Also store in window object as backup (for same window)
    (window as any).__guardianFileHandle = handle;
    
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
 * Load file handle from memory or return null
 * Note: Handles are only available during the same session
 * After browser restart, user will need to select file again
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
      fileHandleStore.set(FILE_HANDLE_ID, handle);
    }
    
    if (handle) {
      try {
        const file = await handle.getFile();
        return {
          handle,
          metadata: {
            fileName: file.name,
            lastModified: file.lastModified,
          },
        };
      } catch (err) {
        // Handle might have lost permission
        console.warn('Handle lost permission:', err);
        fileHandleStore.delete(FILE_HANDLE_ID);
        delete (window as any).__guardianFileHandle;
      }
    }

    // Get metadata from chrome.storage (for showing last used file name)
    const result = await chrome.storage.local.get(FILE_HANDLE_ID);
    const metadata = result[FILE_HANDLE_ID];
    
    if (metadata) {
      return {
        handle: null,
        metadata: {
          fileName: metadata.fileName,
          lastModified: metadata.lastModified,
        },
      };
    }

    return { handle: null, metadata: null };
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
    await chrome.storage.local.remove(FILE_HANDLE_ID);
  } catch (err) {
    console.error('Error clearing file handle:', err);
  }
}

