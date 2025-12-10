import { useState, useCallback } from "react";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { VaultEntry, loadVault, createVault } from "../../../shared/crypto";

interface UseVaultReturn {
  vaultPath: string | null;
  masterPassword: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setVaultPath: (path: string | null) => void;
  setMasterPassword: (password: string) => void;
  loadVaultFile: (path: string, password: string) => Promise<VaultEntry[]>;
  saveVaultFile: (entries: VaultEntry[]) => Promise<void>;
  createNewVault: (path: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useVault(): UseVaultReturn {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVaultFile = useCallback(async (path: string, password: string): Promise<VaultEntry[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const vaultData = await readFile(path);
      const vaultBytes =
        vaultData instanceof Uint8Array ? vaultData : new Uint8Array(vaultData);

      const decryptedVault = await loadVault(password, vaultBytes);
      
      setVaultPath(path);
      setMasterPassword(password);
      
      return decryptedVault.entries;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to load vault. Invalid password or corrupted file.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveVaultFile = useCallback(
    async (entries: VaultEntry[]): Promise<void> => {
      if (!vaultPath || !masterPassword) {
        throw new Error("Vault path or master password not set");
      }

      setIsLoading(true);
      setError(null);

      try {
        const encryptedVault = await createVault(masterPassword, entries);
        await writeFile(vaultPath, encryptedVault);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save vault";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [vaultPath, masterPassword]
  );

  const createNewVault = useCallback(
    async (path: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const encryptedVault = await createVault(password, []);
        await writeFile(path, encryptedVault, { createNew: true });
        
        setVaultPath(path);
        setMasterPassword(password);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create vault";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setVaultPath(null);
    setMasterPassword("");
    setError(null);
  }, []);

  return {
    vaultPath,
    masterPassword,
    isAuthenticated: !!vaultPath && !!masterPassword,
    isLoading,
    error,
    setVaultPath,
    setMasterPassword,
    loadVaultFile,
    saveVaultFile,
    createNewVault,
    logout,
  };
}

