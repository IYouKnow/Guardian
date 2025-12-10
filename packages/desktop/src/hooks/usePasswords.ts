import { useState, useMemo, useCallback } from "react";
import { PasswordEntry } from "../types";
import { VaultEntry } from "../../../shared/crypto";

interface UsePasswordsProps {
  onSave: (entries: VaultEntry[]) => Promise<void>;
}

interface UsePasswordsReturn {
  passwords: PasswordEntry[];
  entryCreatedAtMap: Map<string, string>;
  filteredPasswords: PasswordEntry[];
  categories: string[];
  searchQuery: string;
  activeCategory: string;
  setPasswords: React.Dispatch<React.SetStateAction<PasswordEntry[]>>;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;
  addPassword: (password: PasswordEntry) => Promise<void>;
  updatePassword: (id: string, updates: Partial<PasswordEntry>) => Promise<void>;
  deletePassword: (id: string) => Promise<void>;
  loadPasswords: (vaultEntries: VaultEntry[]) => void;
}

// Helper function to convert VaultEntry to PasswordEntry
function vaultEntryToPasswordEntry(vaultEntry: VaultEntry): PasswordEntry {
  return {
    id: vaultEntry.id,
    title: vaultEntry.name,
    username: vaultEntry.username || "",
    website: vaultEntry.url || "",
    password: vaultEntry.password,
    category: undefined,
    favorite: false,
    passwordStrength: undefined,
    lastModified: vaultEntry.lastModified,
    notes: vaultEntry.notes,
    tags: undefined,
    breached: false,
  };
}

// Helper function to convert PasswordEntry to VaultEntry
function passwordEntryToVaultEntry(passwordEntry: PasswordEntry): VaultEntry {
  return {
    id: passwordEntry.id,
    name: passwordEntry.title,
    username: passwordEntry.username || undefined,
    password: passwordEntry.password,
    url: passwordEntry.website || undefined,
    notes: passwordEntry.notes || undefined,
    createdAt: new Date().toISOString(),
    lastModified: passwordEntry.lastModified || new Date().toISOString(),
  };
}

export function usePasswords({ onSave }: UsePasswordsProps): UsePasswordsReturn {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [entryCreatedAtMap, setEntryCreatedAtMap] = useState<Map<string, string>>(
    new Map()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredPasswords = useMemo(() => {
    return passwords.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.website.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === "all" || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [passwords, searchQuery, activeCategory]);

  const categories = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(passwords.map((p) => p.category).filter((c): c is string => Boolean(c)))
      ),
    ];
  }, [passwords]);

  const loadPasswords = useCallback((vaultEntries: VaultEntry[]) => {
    const loadedPasswords = vaultEntries.map(vaultEntryToPasswordEntry);
    const createdAtMap = new Map<string, string>();
    
    vaultEntries.forEach((entry) => {
      createdAtMap.set(entry.id, entry.createdAt);
    });

    setEntryCreatedAtMap(createdAtMap);
    setPasswords(loadedPasswords);
  }, []);

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

      // Update createdAt map with any new entries
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

  const addPassword = useCallback(
    async (password: PasswordEntry) => {
      const updatedPasswords = [...passwords, password];
      setPasswords(updatedPasswords);
      
      try {
        await savePasswords(updatedPasswords);
      } catch (err) {
        // Revert on error
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
        // Revert on error
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
        
        // Update createdAt map - remove deleted entry
        const newCreatedAtMap = new Map(entryCreatedAtMap);
        newCreatedAtMap.delete(id);
        setEntryCreatedAtMap(newCreatedAtMap);
      } catch (err) {
        // Revert on error
        setPasswords(passwords);
        throw err;
      }
    },
    [passwords, savePasswords, entryCreatedAtMap]
  );

  return {
    passwords,
    entryCreatedAtMap,
    filteredPasswords,
    categories,
    searchQuery,
    activeCategory,
    setPasswords,
    setSearchQuery,
    setActiveCategory,
    addPassword,
    updatePassword,
    deletePassword,
    loadPasswords,
  };
}

