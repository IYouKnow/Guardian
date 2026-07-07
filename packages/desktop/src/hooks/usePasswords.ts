import { useState, useMemo, useCallback } from "react";
import { PasswordEntry, Folder } from "../types";
import { VaultEntry, FolderNode } from "../../../shared/crypto";

interface UsePasswordsProps {
  onSave: (entries: VaultEntry[]) => Promise<void>;
  onSaveFolders?: (folders: FolderNode[]) => Promise<void>;
}

interface UsePasswordsReturn {
  passwords: PasswordEntry[];
  entryCreatedAtMap: Map<string, string>;
  filteredPasswords: PasswordEntry[];
  folders: Folder[];
  searchQuery: string;
  activeFolderId: string | null;
  setPasswords: React.Dispatch<React.SetStateAction<PasswordEntry[]>>;
  setSearchQuery: (query: string) => void;
  setActiveFolderId: (id: string | null) => void;
  addPassword: (password: PasswordEntry) => Promise<void>;
  updatePassword: (id: string, updates: Partial<PasswordEntry>) => Promise<void>;
  deletePassword: (id: string) => Promise<void>;
  loadPasswords: (vaultEntries: VaultEntry[], vaultFolders?: FolderNode[]) => void;
  getVaultEntries: () => VaultEntry[];
  getFolders: () => FolderNode[];
  addFolder: (name: string, parentId: string | null) => Folder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  movePassword: (passwordId: string, folderId: string | null) => Promise<void>;
  reorderPassword: (passwordId: string, targetIndex: number) => Promise<void>;
}

function vaultEntryToPasswordEntry(vaultEntry: VaultEntry): PasswordEntry {
  return {
    id: vaultEntry.id,
    title: vaultEntry.name || "Untitled",
    username: vaultEntry.username || "",
    website: vaultEntry.url || "",
    password: vaultEntry.password,
    favicon: vaultEntry.favicon,
    folderId: vaultEntry.folderId,
    order: vaultEntry.order,
    favorite: false,
    passwordStrength: undefined,
    lastModified: vaultEntry.lastModified,
    notes: vaultEntry.notes,
    tags: undefined,
    breached: false,
  };
}

function passwordEntryToVaultEntry(passwordEntry: PasswordEntry): VaultEntry {
  return {
    id: passwordEntry.id,
    name: passwordEntry.title,
    username: passwordEntry.username || undefined,
    password: passwordEntry.password,
    url: passwordEntry.website || undefined,
    notes: passwordEntry.notes || undefined,
    favicon: passwordEntry.favicon || undefined,
    folderId: passwordEntry.folderId,
    order: passwordEntry.order,
    createdAt: new Date().toISOString(),
    lastModified: passwordEntry.lastModified || new Date().toISOString(),
  };
}

function collectDescendantIds(folders: Folder[], parentId: string): string[] {
  const ids: string[] = [parentId];
  for (const f of folders) {
    if (f.parentId === parentId) {
      ids.push(...collectDescendantIds(folders, f.id));
    }
  }
  return ids;
}

export function usePasswords({ onSave, onSaveFolders }: UsePasswordsProps): UsePasswordsReturn {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [entryCreatedAtMap, setEntryCreatedAtMap] = useState<Map<string, string>>(
    new Map()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const filteredPasswords = useMemo(() => {
    return passwords.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (p.title || "").toLowerCase().includes(q) ||
        (p.username || "").toLowerCase().includes(q) ||
        (p.website || "").toLowerCase().includes(q);
      const matchesFolder =
        activeFolderId === null ||
        (p.folderId != null && collectDescendantIds(folders, activeFolderId).includes(p.folderId));
      return matchesSearch && matchesFolder;
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [passwords, searchQuery, activeFolderId, folders]);

  const savePasswords = useCallback(
    async (updatedPasswords: PasswordEntry[]) => {
      const vaultEntries = updatedPasswords.map((entry) => {
        const vaultEntry = passwordEntryToVaultEntry(entry);
        const originalCreatedAt = entryCreatedAtMap.get(entry.id);
        if (originalCreatedAt) {
          vaultEntry.createdAt = originalCreatedAt;
        }
        return vaultEntry;
      });

      await onSave(vaultEntries);

      const newCreatedAtMap = new Map(entryCreatedAtMap);
      vaultEntries.forEach((entry) => {
        if (!newCreatedAtMap.has(entry.id)) {
          newCreatedAtMap.set(entry.id, entry.createdAt);
        }
      });
      setEntryCreatedAtMap(newCreatedAtMap);
    },
    [onSave, entryCreatedAtMap]
  );

  const persistFolders = useCallback(
    async (updatedFolders: Folder[]) => {
      await onSaveFolders?.(
        updatedFolders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId }))
      );
    },
    [onSaveFolders]
  );

  const loadPasswords = useCallback((vaultEntries: VaultEntry[], vaultFolders?: FolderNode[]) => {
    const needsOrder = vaultEntries.some(e => e.order === undefined);
    const loadedPasswords = vaultEntries.map((entry, index) => {
      const pw = vaultEntryToPasswordEntry(entry);
      if (needsOrder) {
        pw.order = index;
      }
      return pw;
    });
    const createdAtMap = new Map<string, string>();

    vaultEntries.forEach((entry) => {
      createdAtMap.set(entry.id, entry.createdAt);
    });

    setEntryCreatedAtMap(createdAtMap);
    setPasswords(loadedPasswords);
    console.log(`[usePasswords] loadPasswords: setPasswords with ${loadedPasswords.length} passwords`);
    if (vaultFolders) {
      setFolders(
        vaultFolders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId }))
      );
    }
  }, []);

  const addPassword = useCallback(
    async (password: PasswordEntry) => {
      const maxOrder = passwords.reduce((max, p) => Math.max(max, p.order ?? 0), -1);
      const entryWithOrder = { ...password, order: maxOrder + 1 };
      const updatedPasswords = [...passwords, entryWithOrder];
      setPasswords(updatedPasswords);

      try {
        await savePasswords(updatedPasswords);
      } catch (err) {
        setPasswords(passwords);
        throw err;
      }
    },
    [passwords, savePasswords]
  );

  const updatePassword = useCallback(
    async (id: string, updates: Partial<PasswordEntry>) => {
      const updatedPasswords = passwords.map((p) =>
        p.id === id ? { ...p, ...updates, lastModified: new Date().toISOString() } : p
      );
      setPasswords(updatedPasswords);

      try {
        await savePasswords(updatedPasswords);
      } catch (err) {
        setPasswords(passwords);
        throw err;
      }
    },
    [passwords, savePasswords]
  );

  const deletePassword = useCallback(
    async (id: string) => {
      const updatedPasswords = passwords.filter((p) => p.id !== id);
      setPasswords(updatedPasswords);

      try {
        await savePasswords(updatedPasswords);

        const newCreatedAtMap = new Map(entryCreatedAtMap);
        newCreatedAtMap.delete(id);
        setEntryCreatedAtMap(newCreatedAtMap);
      } catch (err) {
        setPasswords(passwords);
        throw err;
      }
    },
    [passwords, savePasswords, entryCreatedAtMap]
  );

  const addFolder = useCallback(
    (name: string, parentId: string | null): Folder => {
      const folder: Folder = { id: crypto.randomUUID(), name, parentId };
      const updated = [...folders, folder];
      setFolders(updated);
      persistFolders(updated);
      return folder;
    },
    [folders, persistFolders]
  );

  const renameFolder = useCallback(
    (id: string, name: string) => {
      const updated = folders.map((f) => (f.id === id ? { ...f, name } : f));
      setFolders(updated);
      persistFolders(updated);
    },
    [folders, persistFolders]
  );

  const deleteFolder = useCallback(
    (id: string) => {
      const descendantIds = collectDescendantIds(folders, id);
      const remainingFolders = folders.filter((f) => !descendantIds.includes(f.id));
      const updatedPasswords = passwords.map((p) =>
        p.folderId && descendantIds.includes(p.folderId)
          ? { ...p, folderId: undefined }
          : p
      );
      setFolders(remainingFolders);
      setPasswords(updatedPasswords);
      persistFolders(remainingFolders);
      savePasswords(updatedPasswords);
      if (activeFolderId && descendantIds.includes(activeFolderId)) {
        setActiveFolderId(null);
      }
    },
    [folders, passwords, activeFolderId, persistFolders, savePasswords]
  );

  const movePassword = useCallback(
    async (passwordId: string, folderId: string | null) => {
      await updatePassword(passwordId, { folderId: folderId ?? undefined });
    },
    [updatePassword]
  );

  const reorderPassword = useCallback(
    async (passwordId: string, targetIndex: number) => {
      const sorted = [...passwords].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const draggedIndex = sorted.findIndex(p => p.id === passwordId);
      if (draggedIndex === -1) return;

      const [dragged] = sorted.splice(draggedIndex, 1);
      const adjustedTarget = draggedIndex < targetIndex
        ? Math.min(targetIndex, sorted.length)
        : targetIndex;
      sorted.splice(adjustedTarget, 0, dragged);

      const reordered = sorted.map((p, i) => ({ ...p, order: i }));
      setPasswords(reordered);

      try {
        await savePasswords(reordered);
      } catch (err) {
        setPasswords(passwords);
        throw err;
      }
    },
    [passwords, savePasswords]
  );

  return {
    passwords,
    entryCreatedAtMap,
    filteredPasswords,
    folders,
    searchQuery,
    activeFolderId,
    setPasswords,
    setSearchQuery,
    setActiveFolderId,
    addPassword,
    updatePassword,
    deletePassword,
    loadPasswords,
    getVaultEntries: useCallback(() => {
      return passwords.map((entry) => {
        const vaultEntry = passwordEntryToVaultEntry(entry);
        const originalCreatedAt = entryCreatedAtMap.get(entry.id);
        if (originalCreatedAt) {
          vaultEntry.createdAt = originalCreatedAt;
        }
        return vaultEntry;
      });
    }, [passwords, entryCreatedAtMap]),
    getFolders: useCallback(() => {
      return folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId }));
    }, [folders]),
    addFolder,
    renameFolder,
    deleteFolder,
    movePassword,
    reorderPassword,
  };
}
