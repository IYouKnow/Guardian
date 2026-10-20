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
import { toast } from 'sonner';
import { Check, Loader2, Lock, RotateCw, Save } from 'lucide-react';
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

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
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
          <TabsTrigger value="security" className={tabTrigger}>Security</TabsTrigger>
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

        <TabsContent value="security" className="space-y-5">
          <Section title="Security & access">
            <Row label="Two-factor authentication" desc="Require 2FA for all admin accounts." control={<Switch checked={twoFactor} onCheckedChange={setTwoFactor} />} />
            <Row label="Automatic backups" desc="Run scheduled backups on connected providers." control={<Switch checked={autoBackup} onCheckedChange={setAutoBackup} />} />
            <Row label="Encryption at rest" desc="AES-256 encryption for all stored vault data." control={<span className="border border-emerald-500/35 bg-emerald-500/[0.08] px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-emerald-400">Enabled</span>} />
            <Row label="Audit logging" desc="Record all admin actions for compliance." control={<span className="border border-emerald-500/35 bg-emerald-500/[0.08] px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-emerald-400">Enabled</span>} />
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
