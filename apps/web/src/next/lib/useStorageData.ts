import { useCallback, useEffect, useState } from 'react';
import { adminApi, type StorageOverview } from '@/api/admin';

export interface StorageData {
  data: StorageOverview | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Loads the data behind the Storage page from GET /api/admin/storage. The
 * payload is shape-checked so a missing or older route (which 404s) only leaves
 * the page on its placeholder instead of crashing.
 */
export function useStorageData(): StorageData {
  const [data, setData] = useState<StorageOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await adminApi.getStorage();
      if (result && Array.isArray(result.breakdown) && Array.isArray(result.users)) {
        setData(result);
      }
    } catch {
      // Leave the last payload in place; the page renders its placeholder.
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { data, loading, refresh };
}
