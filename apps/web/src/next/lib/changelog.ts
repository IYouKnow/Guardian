// Server release history shown in Settings → Updates.
//
// This list is maintained by hand: append a new entry each time a `server-v*`
// tag is cut (newest first). `version` must match the tag without its prefix,
// e.g. the `server-v0.3.0` tag is recorded as "0.3.0" so it lines up with the
// live value reported by the server's /health endpoint.

export type ChangeKind = 'added' | 'improved' | 'fixed' | 'security';

export interface Change {
  kind: ChangeKind;
  text: string;
}

export interface Release {
  version: string;
  date: string;
  summary: string;
  changes: Change[];
}

export const CHANGELOG: Release[] = [
  {
    version: '0.4.0',
    date: '2026-10-25',
    summary: 'Per-user backups with per-user Google Drive mirroring, downloads, and a guided setup.',
    changes: [
      { kind: 'added', text: 'Per-user vault backups — every account can snapshot its own vault to the server, with a private history.' },
      { kind: 'added', text: 'Google Drive mirroring per user: each account links its own Drive, and only its own snapshot is uploaded.' },
      { kind: 'added', text: 'Download any snapshot as a .zip — admins across all accounts, users for their own vault.' },
      { kind: 'added', text: 'Backup history gains search, status/source/Drive filters, and summary stats.' },
      { kind: 'added', text: 'Settings -> Updates tab showing the running server version and release history.' },
      { kind: 'improved', text: 'Settings -> Backups is now a single setup flow: enable backups, allow user backups, and configure the Google Drive client with the exact redirect URI to register.' },
      { kind: 'improved', text: 'Sidebar split into Personal and Admin sections, with console routes under /admin.' },
      { kind: 'security', text: 'Drive refresh tokens and backup keys are sealed at rest, and disconnecting revokes the Google grant.' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-21',
    summary: 'Live platform data, telemetry, and scheduled backups.',
    changes: [
      { kind: 'added', text: 'Backup management with scheduled snapshots, run history, and retention.' },
      { kind: 'added', text: 'Traffic telemetry — per-day upload and download metrics with reporting endpoints.' },
      { kind: 'added', text: 'Activity log recording admin and user actions in a searchable audit view.' },
      { kind: 'improved', text: 'Overview dashboard now renders live server metrics instead of static placeholders.' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-10-20',
    summary: 'New admin console and server platform details.',
    changes: [
      { kind: 'added', text: 'Platform info endpoint (GET /api/admin/platform) with version, uptime, runtime, and database size.' },
      { kind: 'improved', text: 'Replaced the legacy admin UI with the ported Guardian console split into Personal and Admin sections.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-18',
    summary: 'First public server release — auth, invites, and sync.',
    changes: [
      { kind: 'added', text: 'JWT authentication with register, login, and session validation.' },
      { kind: 'added', text: 'Multi-tenant user management with invite tokens and a first-run admin setup code.' },
      { kind: 'added', text: 'Server-synced user preferences (theme, accent color, appearance).' },
      { kind: 'added', text: 'Realtime sync over WebSocket with an SSE fallback.' },
      { kind: 'security', text: 'Hardened auth — login rate limiting, token versioning, configurable CORS, trusted-proxy handling, and security headers/HSTS.' },
    ],
  },
];

export const KIND_LABELS: Record<ChangeKind, string> = {
  added: 'Added',
  improved: 'Improved',
  fixed: 'Fixed',
  security: 'Security',
};

export const KIND_STYLES: Record<ChangeKind, string> = {
  added: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-400',
  improved: 'border-sky-500/35 bg-sky-500/[0.08] text-sky-400',
  fixed: 'border-amber-500/35 bg-amber-500/[0.08] text-amber-400',
  security: 'border-primary/40 bg-primary/[0.08] text-primary',
};

export const LATEST_VERSION = CHANGELOG[0]?.version ?? '';
