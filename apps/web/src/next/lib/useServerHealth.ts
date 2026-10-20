import { useEffect, useState } from 'react';

export interface ServerHealth {
  version: string;
  status: string;
}

/** Reads version + status from the public /health endpoint ('' while loading). */
export function useServerHealth(): ServerHealth {
  const [health, setHealth] = useState<ServerHealth>({ version: '', status: '' });

  useEffect(() => {
    let active = true;
    fetch('/health')
      .then((res) => res.json())
      .then((data: { version?: string; status?: string }) => {
        if (active) setHealth({ version: data.version || '', status: data.status || '' });
      })
      .catch(() => { if (active) setHealth({ version: '', status: '' }); });
    return () => { active = false; };
  }, []);

  return health;
}
