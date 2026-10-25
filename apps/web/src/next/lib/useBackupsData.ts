import { useCallback, useEffect, useState } from 'react';
import { adminApi, type BackupRecord, type BackupSchedule } from '@/api/admin';
import { userBackupApi, type BackupDestination } from '@/api/backups';

export type BackupsVariant = 'personal' | 'admin';

export interface BackupsData {
  backups: BackupRecord[] | null;
  schedules: BackupSchedule[] | null;
  destination: BackupDestination | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Loads the data behind the Backups page. The `personal` variant reads the
 * caller's own vault snapshots plus their own Google Drive destination; the
 * `admin` variant reads the full history across all users plus schedules.
 *
 * The requests settle independently and each payload is shape-checked, so a
 * single failure (an expired session, an old server without the routes) only
 * leaves that panel on its placeholder instead of blanking the page.
 */
export function useBackupsData(variant: BackupsVariant): BackupsData {
  const [backups, setBackups] = useState<BackupRecord[] | null>(null);
  const [schedules, setSchedules] = useState<BackupSchedule[] | null>(null);
  const [destination, setDestination] = useState<BackupDestination | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (variant === 'personal') {
      const [list, dest] = await Promise.allSettled([userBackupApi.list(), userBackupApi.getDestination()]);
      if (list.status === 'fulfilled' && Array.isArray(list.value)) setBackups(list.value);
      if (dest.status === 'fulfilled' && dest.value) setDestination(dest.value);
      setSchedules([]);
      return;
    }

    const [list, sched] = await Promise.allSettled([adminApi.getBackups(), adminApi.getSchedules()]);
    if (list.status === 'fulfilled' && Array.isArray(list.value)) setBackups(list.value);
    if (sched.status === 'fulfilled' && Array.isArray(sched.value)) setSchedules(sched.value);
    setDestination(null);
  }, [variant]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { backups, schedules, destination, loading, refresh };
}
