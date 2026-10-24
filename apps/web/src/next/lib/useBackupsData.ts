import { useCallback, useEffect, useState } from 'react';
import { adminApi, type BackupDestination, type BackupRecord, type BackupSchedule } from '@/api/admin';

export interface BackupsData {
  backups: BackupRecord[] | null;
  schedules: BackupSchedule[] | null;
  destination: BackupDestination | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Loads the live data behind the Backups page: backup history, schedules and the
 * remote (Google Drive) destination. All three endpoints are admin-scoped and the
 * page only mounts for admins.
 *
 * The requests settle independently and each payload is shape-checked, so a
 * single failure (an expired session, an old server without the routes) only
 * leaves that panel on its placeholder instead of blanking the page.
 */
export function useBackupsData(): BackupsData {
  const [backups, setBackups] = useState<BackupRecord[] | null>(null);
  const [schedules, setSchedules] = useState<BackupSchedule[] | null>(null);
  const [destination, setDestination] = useState<BackupDestination | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [list, sched, dest] = await Promise.allSettled([
      adminApi.getBackups(),
      adminApi.getSchedules(),
      adminApi.getBackupDestination(),
    ]);
    if (list.status === 'fulfilled' && Array.isArray(list.value)) setBackups(list.value);
    if (sched.status === 'fulfilled' && Array.isArray(sched.value)) setSchedules(sched.value);
    if (dest.status === 'fulfilled' && dest.value) setDestination(dest.value);
  }, []);

  useEffect(() => {
    let active = true;
    load().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { backups, schedules, destination, loading, refresh };
}
