import { useCallback, useEffect, useState, type ReactNode } from 'react';
import PageHeader from '@next/components/PageHeader';
import { Card } from '@next/components/ui/card';
import { Button } from '@next/components/ui/button';
import { Input } from '@next/components/ui/input';
import { Switch } from '@next/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@next/components/ui/tabs';
import { Label } from '@next/components/ui/label';
import { useTheme } from '@next/components/ThemeProvider';
import {
  ACCENT_OPTIONS,
  THEME_OPTIONS,
  accentSwatch,
  consoleThemeClass,
} from '@next/lib/appearance';
import { adminApi, type PlatformInfo } from '@/api/admin';
import { formatUptime } from '@next/lib/format';
import { CHANGELOG, KIND_LABELS, KIND_STYLES, LATEST_VERSION, type Release } from '@next/lib/changelog';
import { useServerHealth } from '@next/lib/useServerHealth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Check, Loader2, Lock, Package, RotateCw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const themeLabels: Record<string, string> = {
  system: 'System', light: 'Light', dark: 'Dark', slate: 'Slate', editor: 'Editor', violet: 'Violet',
};

const tabTrigger = 'rounded-sm font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <Card className="rounded-sm border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
        <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

interface RowProps {
  label: string;
  desc: string;
  control: ReactNode;
}

function Row({ label, desc, control }: RowProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-3.5 last:border-0">
      <div className="pr-4">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      {control}
    </div>
  );
}

// Real server configuration (max_ws_per_ip_default). Mounted inside the Server
// tab, so it only fetches when that tab is viewed.
function ServerSettings() {
  const [wsDefault, setWsDefault] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSettings();
      setWsDefault(data.max_ws_per_ip_default ?? '0');
      setForbidden(false);
    } catch (error) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 403) setForbidden(true);
      else toast.error('Failed to load server settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updateSetting('max_ws_per_ip_default', wsDefault);
      toast.success('WebSocket limit updated');
    } catch (error) {
      const err = error as { response?: { data?: unknown } };
      toast.error(typeof err.response?.data === 'string' ? err.response.data : 'Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return (
      <Section title="Server settings" subtitle="Global rate limits and configuration">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Admin access required to view server settings.
        </div>
      </Section>
    );
  }

  return (
    <Section title="Server settings" subtitle="Global rate limits and configuration">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-eyebrow">Max WebSocket connections per IP</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              value={wsDefault}
              onChange={(e) => setWsDefault(e.target.value)}
              disabled={loading}
              className="h-9 w-24 rounded-sm border-border bg-background text-center font-mono text-[13px]"
            />
            <Button
              onClick={save}
              disabled={saving || loading}
              className="h-9 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
            <Button
              variant="outline"
              onClick={load}
              disabled={loading}
              className="h-9 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <RotateCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">
        0 = unlimited. Per-user overrides are set on each user.
      </p>
    </Section>
  );
}

// Live platform details reported by GET /api/admin/platform. Mounted inside the
// Server tab so it only fetches when that tab is viewed.
function PlatformInfoPanel() {
  const [info, setInfo] = useState<PlatformInfo | null>(null);

  useEffect(() => {
    let active = true;
    adminApi
      .getPlatformInfo()
      .then((data) => { if (active) setInfo(data); })
      .catch(() => { if (active) setInfo(null); });
    return () => { active = false; };
  }, []);

  const cells = [
    { label: 'Version', value: info ? `v${info.version}` : '—' },
    { label: 'Status', value: info?.status ?? '—' },
    { label: 'Uptime', value: info ? formatUptime(info.uptime_seconds) : '—' },
    { label: 'Environment', value: info?.environment ?? '—' },
    { label: 'Runtime', value: info?.go_version ?? '—' },
    { label: 'Platform', value: info ? `${info.os}/${info.arch}` : '—' },
    { label: 'Database', value: info?.database_size ?? '—' },
    { label: 'Users', value: info ? String(info.users) : '—' },
  ];

  return (
    <Section title="Platform information" subtitle="Reported by the server">
      <div className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="bg-card p-3.5">
            <p className="text-eyebrow">{c.label}</p>
            <p className="mt-1.5 truncate font-mono text-[13px] text-foreground" title={c.value}>{c.value}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// Whether non-admin users may back up their own vault. When enabled, the
// Backups page opens for them with a scoped, own-vault-only view.
function UserBackupsSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSettings();
      setEnabled(data.users_can_backup === '1');
    } catch {
      toast.error('Failed to load the backup settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (next: boolean) => {
    const previous = enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await adminApi.updateSetting('users_can_backup', next ? '1' : '0');
      toast.success(next ? 'User backups enabled' : 'User backups disabled');
    } catch {
      setEnabled(previous);
      toast.error('Failed to update the setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="User backups" subtitle="Let non-admin users back up their own data">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-foreground">Allow users to create backups</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each user can snapshot their own vault on this server. Their history is private and never
            includes other accounts' data. Admins are unaffected.
          </p>
        </div>
        <Switch checked={enabled} disabled={loading || saving} onCheckedChange={toggle} />
      </div>
    </Section>
  );
}

// Numbered setup guide for the Google OAuth client, shown above the form.
const GOOGLE_SETUP_STEPS: ReactNode[] = [
  <>In the Google Cloud Console, create (or pick) a project and enable the <span className="text-foreground">Google Drive API</span>.</>,
  <>Create an OAuth client of type <span className="text-foreground">Desktop app</span> — not <span className="text-foreground">Web application</span>.</>,
  <>On the <span className="text-foreground">OAuth consent screen</span>, add the scope <code className="font-mono text-[11px] text-foreground">https://www.googleapis.com/auth/drive.file</code> and publish the app (it is non-sensitive, so Google requires no review).</>,
  <>Paste the <span className="text-foreground">Client ID</span> and <span className="text-foreground">Client secret</span> below, then Save.</>,
  <>Open <span className="text-foreground">Backups</span> and click <span className="text-foreground">Connect Google Drive</span> to approve access.</>,
];

function SetupSteps({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="space-y-2.5 border border-border bg-background/50 p-4">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center border border-border font-mono text-[10px] text-muted-foreground">{i + 1}</span>
          <span className="text-xs text-muted-foreground">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// Operator-supplied Google OAuth client used by the Backups page to connect
// Google Drive. The secret is write-only: the API reports only whether one is
// stored, never its value.
function GoogleBackupSettings() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getBackupIntegration();
      setClientId(data.client_id);
      setConfigured(data.client_secret_configured);
      setClientSecret('');
    } catch {
      toast.error('Failed to load the Google backup settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!clientId.trim()) {
      toast.error('A client ID is required');
      return;
    }
    setSaving(true);
    try {
      const secret = clientSecret.trim();
      const data = await adminApi.updateBackupIntegration(
        secret ? { client_id: clientId.trim(), client_secret: secret } : { client_id: clientId.trim() },
      );
      setConfigured(data.client_secret_configured);
      setClientSecret('');
      toast.success('Google client saved');
    } catch (error) {
      const err = error as { response?: { data?: unknown } };
      toast.error(typeof err.response?.data === 'string' ? err.response.data : 'Failed to save the Google client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Google Drive" subtitle="OAuth client used to upload snapshots">
      <div className="space-y-4">
        <div>
          <p className="text-eyebrow mb-3">Setup steps</p>
          <SetupSteps steps={GOOGLE_SETUP_STEPS} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-eyebrow">Client ID</Label>
          <Input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={loading}
            placeholder="1234567890-abc.apps.googleusercontent.com"
            className="h-9 rounded-sm border-border bg-background font-mono text-[12px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-eyebrow">Client secret</Label>
          <Input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            disabled={loading}
            placeholder={configured ? '•••••••• stored — leave blank to keep' : 'Paste the client secret'}
            className="h-9 rounded-sm border-border bg-background font-mono text-[12px]"
          />
          <p className="font-mono text-[10px] text-muted-foreground">
            {configured ? 'A secret is stored, sealed at rest. It is never displayed; enter a new one to replace it.' : 'Not set yet.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={save}
            disabled={saving || loading}
            className="h-9 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
          <Button
            variant="outline"
            onClick={load}
            disabled={loading}
            className="h-9 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <RotateCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          Leave the redirect URIs empty — Desktop clients accept any loopback port.
        </p>
      </div>
    </Section>
  );
}

function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 border px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider', className)}>
      {children}
    </span>
  );
}

function formatReleaseDate(iso: string) {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

function ReleaseRow({ release, running, isLatest, isLast }: { release: Release; running: boolean; isLatest: boolean; isLast: boolean }) {
  return (
    <li className="relative pl-7">
      <span
        className={cn(
          'absolute left-[3px] top-[7px] h-2.5 w-2.5 rounded-full ring-4 ring-card',
          running ? 'bg-primary' : isLatest ? 'bg-foreground/40' : 'bg-border',
        )}
      />
      {!isLast && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />}
      <div className={cn('pb-7', isLast && 'pb-0')}>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[13px] font-medium text-foreground">v{release.version}</span>
          {running && <Tag className="border-primary/40 bg-primary/[0.08] text-primary">Running</Tag>}
          {isLatest && !running && <Tag className="border-border bg-muted text-muted-foreground">Latest</Tag>}
          <span className="font-mono text-[11px] text-muted-foreground">{formatReleaseDate(release.date)}</span>
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">{release.summary}</p>
        <ul className="mt-3 space-y-2">
          {release.changes.map((change, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Tag className={cn('mt-px shrink-0', KIND_STYLES[change.kind])}>{KIND_LABELS[change.kind]}</Tag>
              <span className="text-[13px] leading-relaxed text-foreground/90">{change.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

// Current server version (live from /health) plus the hand-maintained release
// history defined in @next/lib/changelog.
function UpdatesPanel() {
  const { version } = useServerHealth();
  const current = version.replace(/^v/i, '');
  const latest = LATEST_VERSION;
  const known = CHANGELOG.some((r) => r.version === current);
  const upToDate = !!current && current === latest;

  let statusBadge: ReactNode;
  let hint: string;
  if (!current) {
    statusBadge = <Tag className="border-border bg-muted text-muted-foreground">Checking…</Tag>;
    hint = 'Contacting the server…';
  } else if (current === 'dev') {
    statusBadge = <Tag className="border-zinc-500/35 bg-zinc-500/[0.08] text-zinc-400">Dev build</Tag>;
    hint = 'Untagged development build — not on a release channel.';
  } else if (upToDate) {
    statusBadge = <Tag className="border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-400">Up to date</Tag>;
    hint = 'You are running the latest release.';
  } else if (known) {
    statusBadge = <Tag className="border-amber-500/35 bg-amber-500/[0.08] text-amber-400">Update available</Tag>;
    hint = `A newer release, v${latest}, is available.`;
  } else {
    statusBadge = <Tag className="border-border bg-muted text-muted-foreground">Unrecognized</Tag>;
    hint = 'This version is not in the release history.';
  }

  return (
    <div className="space-y-5">
      <Section title="Current version" subtitle="Reported by the running server">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center border border-border bg-background text-muted-foreground">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-[22px] font-semibold leading-none text-foreground">{current ? `v${current}` : '—'}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {statusBadge}
            {!!current && current !== 'dev' && !upToDate && (
              <span className="font-mono text-[11px] text-muted-foreground">latest v{latest}</span>
            )}
          </div>
        </div>
      </Section>

      <Section title="Release history" subtitle="What changed in each version">
        <ol>
          {CHANGELOG.map((release, i) => (
            <ReleaseRow
              key={release.version}
              release={release}
              running={release.version === current}
              isLatest={release.version === latest}
              isLast={i === CHANGELOG.length - 1}
            />
          ))}
        </ol>
      </Section>
    </div>
  );
}

export default function Settings() {
  const { mode, setTheme, accentColor, setAccentColor } = useTheme();
  const [twoFactor, setTwoFactor] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);

  const swatchTheme = consoleThemeClass(mode);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Customize appearance and configure platform behavior."
      />

      <Tabs defaultValue="appearance" className="space-y-5">
        <TabsList className="h-auto gap-1 rounded-sm border-border bg-card p-1">
          <TabsTrigger value="appearance" className={tabTrigger}>Appearance</TabsTrigger>
          <TabsTrigger value="server" className={tabTrigger}>Server</TabsTrigger>
          <TabsTrigger value="backup" className={tabTrigger}>Backup &amp; Sync</TabsTrigger>
          <TabsTrigger value="security" className={tabTrigger}>Security</TabsTrigger>
          <TabsTrigger value="updates" className={tabTrigger}>Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-5">
          <Section title="Theme" subtitle="Synced across devices">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {THEME_OPTIONS.map((id) => {
                const palette = consoleThemeClass(id);
                const active = mode === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className="group flex flex-col items-center gap-2.5"
                  >
                    {/* The palette class is a plain class selector, so the tile
                        renders itself with that theme's variables. */}
                    <span
                      className={cn(
                        'block w-full border transition-all',
                        active ? 'border-primary ring-1 ring-primary' : 'border-border group-hover:border-foreground/25'
                      )}
                    >
                      <span className={cn('flex aspect-[4/3] flex-col gap-1.5 bg-background p-2', palette)}>
                        <span className="h-1.5 w-2/3 bg-muted" />
                        <span className="grid flex-1 grid-cols-2 gap-1.5">
                          <span className="border border-border bg-card" />
                          <span className="border border-border bg-card" />
                        </span>
                        <span className="h-2.5 w-full" style={{ background: accentSwatch(accentColor, palette) }} />
                      </span>
                    </span>
                    <span className={cn('font-mono text-[10px] uppercase tracking-wider', active ? 'text-primary' : 'text-muted-foreground')}>
                      {themeLabels[id] ?? id}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Accent color" subtitle="Synced across devices">
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className={cn(
                    'flex items-center gap-2.5 border px-3 py-2 transition-colors',
                    accentColor === color ? 'border-foreground/25 bg-foreground/[0.04]' : 'border-border hover:border-foreground/25'
                  )}
                >
                  <span className="h-4 w-4 border border-border" style={{ background: accentSwatch(color, swatchTheme) }} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-foreground">{color}</span>
                  {accentColor === color && <Check className="h-3 w-3 text-primary" />}
                </button>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="server" className="space-y-5">
          <ServerSettings />

          <PlatformInfoPanel />
        </TabsContent>

        <TabsContent value="backup" className="space-y-5">
          <UserBackupsSettings />

          <GoogleBackupSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-5">
          <Section title="Security & access">
            <Row label="Two-factor authentication" desc="Require 2FA for all admin accounts." control={<Switch checked={twoFactor} onCheckedChange={setTwoFactor} />} />
            <Row label="Automatic backups" desc="Run scheduled backups on connected providers." control={<Switch checked={autoBackup} onCheckedChange={setAutoBackup} />} />
            <Row label="Encryption at rest" desc="AES-256 encryption for all stored vault data." control={<span className="border border-emerald-500/35 bg-emerald-500/[0.08] px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-emerald-400">Enabled</span>} />
            <Row label="Audit logging" desc="Record all admin actions for compliance." control={<span className="border border-emerald-500/35 bg-emerald-500/[0.08] px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-emerald-400">Enabled</span>} />
          </Section>
        </TabsContent>

        <TabsContent value="updates" className="space-y-5">
          <UpdatesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
