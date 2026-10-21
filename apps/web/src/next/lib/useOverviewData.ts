import { useEffect, useState } from 'react';
import { adminApi, type ActivityEntry, type AdminUser, type PlatformInfo } from '@/api/admin';

export interface OverviewData {
  platform: PlatformInfo | null;
  users: AdminUser[] | null;
  activity: ActivityEntry[] | null;
  loading: boolean;
}

/**
 * Loads the live data behind the Overview dashboard's metric cards and activity
 * log. Every endpoint is admin-scoped and the page only mounts for admins.
 *
 * Each request settles independently and every payload is shape-checked, so a
 * single failing or unexpected response (an expired session, a route the running
 * server doesn't have yet, a non-JSON body) only leaves that panel on its
 * placeholder instead of taking the whole dashboard down.
 */
export function useOverviewData(): OverviewData {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([adminApi.getPlatformInfo(), adminApi.getUsers(), adminApi.getActivity()])
      .then(([info, list, events]) => {
        if (!active) return;
        if (info.status === 'fulfilled' && info.value && typeof info.value === 'object') {
          setPlatform(info.value);
        }
        if (list.status === 'fulfilled' && Array.isArray(list.value)) {
          setUsers(list.value);
        }
        if (events.status === 'fulfilled' && Array.isArray(events.value)) {
          setActivity(events.value);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { platform, users, activity, loading };
}
