import { useMemo, type ReactNode } from 'react';
import PageHeader from '@next/components/PageHeader';
import MetricRail, { type MetricRailItem } from '@next/components/MetricRail';
import ActivityChart from '@next/components/ActivityChart';
import { Card } from '@next/components/ui/card';
import { Button } from '@next/components/ui/button';
import { backupsMetric } from '@next/lib/mockData';
import { useOverviewData } from '@next/lib/useOverviewData';
import { formatBytes, formatRelativeTime, formatUptime, parseBytes } from '@next/lib/format';
import { withinDays } from '@next/lib/csv';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const activityBar: Record<string, string> = {
  auth: 'bg-zinc-400',
  user: 'bg-emerald-400',
  invite: 'bg-sky-400',
  setting: 'bg-violet-400',
  vault: 'bg-amber-400',
  system: 'bg-zinc-400',
};

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

function PanelHeader({ title, subtitle, right }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
      <div className="min-w-0">
        <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export default function Overview() {
  const { platform, users, activity, loading } = useOverviewData();
  const events = activity ?? [];

  const metrics = useMemo<MetricRailItem[]>(() => {
    const list = users ?? [];
    const activeUsers = list.filter((u) => u.status === 'ACTIVE').length;
    const newThisWeek = list.filter((u) => withinDays(u.created_at, 7)).length;
    const usedBytes = list.reduce((sum, u) => sum + parseBytes(u.used_space), 0);
    const overheadBytes = list.reduce((sum, u) => sum + parseBytes(u.used_space_overhead), 0);
    const unavailable = loading ? 'loading…' : 'unavailable';

    return [
      {
        id: 'users',
        label: 'Active Users',
        icon: 'users',
        value: users ? activeUsers.toLocaleString() : '—',
        delta: newThisWeek > 0 ? `+${newThisWeek}` : undefined,
        trend: 'up',
        sub: users ? `${list.length} total` : unavailable,
      },
      {
        id: 'storage',
        label: 'Storage Used',
        icon: 'database',
        value: users ? formatBytes(usedBytes) : '—',
        sub: users ? `${list.length} vaults · ${formatBytes(overheadBytes)} overhead` : unavailable,
      },
      backupsMetric,
      {
        id: 'uptime',
        label: 'Platform Uptime',
        icon: 'activity',
        value: platform ? formatUptime(platform.uptime_seconds) : '—',
        sub: platform ? `${platform.environment} · v${platform.version}` : unavailable,
      },
    ];
  }, [platform, users, loading]);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Vault Operations"
        title="Overview"
        description="Real-time pulse of the Guardian vault platform across all regions."
        badge={
          <span className="inline-flex items-center gap-1.5 border border-emerald-500/35 bg-emerald-500/[0.08] px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse bg-emerald-400" />
            Live
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground">Export</Button>
            <Button size="sm" className="h-8 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90">
              Reports <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </>
        }
      />

      {/* Telemetry band */}
      <MetricRail items={metrics} />

      {/* Activity chart + log */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="rounded-sm lg:col-span-2">
          <PanelHeader
            title="Traffic Telemetry"
            subtitle="Last 7 days"
            right={
              <div className="hidden items-center gap-4 sm:flex">
                {[
                  { label: 'Uploads', color: 'hsl(var(--chart-1))' },
                  { label: 'Downloads', color: 'hsl(var(--chart-2))' },
                  { label: 'Backups', color: 'hsl(var(--chart-3))' },
                ].map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="h-2 w-2" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            }
          />
          <div className="px-3 pb-3 pt-4">
            <ActivityChart />
          </div>
        </Card>

        <Card className="flex flex-col rounded-sm">
          <PanelHeader
            title="Activity Log"
            subtitle={`${events.length} events`}
            right={<button className="font-mono text-[10px] uppercase tracking-wider text-primary hover:underline">View all</button>}
          />
          <div className="scrollbar-thin flex-1 divide-y divide-border/60 overflow-y-auto lg:max-h-[336px]">
            {events.length === 0 && (
              <p className="px-5 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {loading ? 'Loading…' : 'No activity yet'}
              </p>
            )}
            {events.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-background/50">
                <span className={cn('h-6 w-[2px] shrink-0', activityBar[a.category] || activityBar.system)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground">{a.actor || 'system'}</span> {a.action}{' '}
                    {a.target && <span className="font-medium text-foreground">{a.target}</span>}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {formatRelativeTime(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
