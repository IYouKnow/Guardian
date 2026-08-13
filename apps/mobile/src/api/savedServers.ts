export type SavedServer = {
  url: string;
  username: string;
  lastLoginAt: string;
};

const STORAGE_KEY = "guardian_saved_servers";

export function cleanUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getSavedServers(): SavedServer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is SavedServer => {
        const s = item as Partial<SavedServer>;
        return typeof s?.url === "string" && s.url.length > 0;
      })
      .map((s) => ({
        url: s.url,
        username: typeof s.username === "string" ? s.username : "",
        lastLoginAt: typeof s.lastLoginAt === "string" ? s.lastLoginAt : "",
      }));
  } catch {
    return [];
  }
}

export function saveServer(server: { url: string; username: string }): void {
  const url = cleanUrl(server.url);
  if (!url) return;

  const servers = getSavedServers();
  const existing = servers.find((s) => s.url === url);
  const next: SavedServer = {
    url,
    username: server.username.trim(),
    lastLoginAt: new Date().toISOString(),
  };

  const updated = existing
    ? servers.map((s) => (s.url === url ? next : s))
    : [...servers, next];

  updated.sort((a, b) => b.lastLoginAt.localeCompare(a.lastLoginAt));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeServer(url: string): void {
  const target = cleanUrl(url);
  const servers = getSavedServers().filter((s) => s.url !== target);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
}

export function displayNameFor(url: string): string {
  return cleanUrl(url)
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}