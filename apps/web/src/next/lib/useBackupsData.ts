import { useCallback, useEffect, useState } from 'react';
import { adminApi, type BackupDestination, type BackupRecord, type BackupSchedule } from '@/api/admin';
import { userBackupApi } from '@/api/backups';

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
 * caller's own vault snapshots; the `admin` variant reads the full history across
 * all users plus schedules and the Google Drive destination.
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
      const [list] = await Promise.allSettled([userBackupApi.list()]);
      if (list.status === 'fulfilled' && Array.isArray(list.value)) setBackups(list.value);
      setSchedules([]);
      setDestination(null);
      return;
    }

    const [list, sched, dest] = await Promise.allSettled([
      adminApi.getBackups(),
      adminApi.getSchedules(),
      adminApi.getBackupDestination(),
    ]);
    if (list.status === 'fulfilled' && Array.isArray(list.value)) setBackups(list.value);
    if (sched.status === 'fulfilled' && Array.isArray(sched.value)) setSchedules(sched.value);
    if (dest.status === 'fulfilled' && dest.value) setDestination(dest.value);
  }, [variant]);

  useEffect(() => {
    let active = true;
    load().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { backups, schedules, destination, loading, refresh };
}
