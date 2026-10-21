import { useEffect, useState } from 'react';
import { adminApi, type AdminUser, type PlatformInfo } from '@/api/admin';

export interface OverviewData {
  platform: PlatformInfo | null;
  users: AdminUser[] | null;
  loading: boolean;
}

/**
 * Loads the live data behind the Overview dashboard's metric cards. Both
 * endpoints are admin-scoped; the page only mounts for admins, so an error here
 * just leaves the cards on their placeholder values.
 */
export function useOverviewData(): OverviewData {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([adminApi.getPlatformInfo(), adminApi.getUsers()])
      .then(([info, list]) => {
        if (!active) return;
        setPlatform(info);
        setUsers(list);
      })
      .catch(() => { /* cards fall back to placeholders */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { platform, users, loading };
}
