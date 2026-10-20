import type { ReactNode } from 'react';
import PageHeader, { StatusBadge } from '@next/components/PageHeader';
import MetricRail from '@next/components/MetricRail';
import ActivityChart from '@next/components/ActivityChart';
import { Icon } from '@next/components/Icon';
import { Card } from '@next/components/ui/card';
import { Button } from '@next/components/ui/button';
import { overviewStats, recentActivity, serverHealth } from '@next/lib/mockData';
import { ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const activityBar: Record<string, string> = {
  upload: 'bg-emerald-400',
  restore: 'bg-sky-400',
  share: 'bg-violet-400',
  delete: 'bg-rose-400',
  backup: 'bg-amber-400',
  auth: 'bg-zinc-400',
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

function meterColor(v: number): string {
  if (v >= 80) return 'bg-rose-500';
  if (v >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function Overview() {
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
      <MetricRail items={overviewStats} />

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
            subtitle={`${recentActivity.length} events`}
            right={<button className="font-mono text-[10px] uppercase tracking-wider text-primary hover:underline">View all</button>}
          />
          <div className="scrollbar-thin flex-1 divide-y divide-border/60 overflow-y-auto lg:max-h-[336px]">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-background/50">
                <span className={cn('h-6 w-[2px] shrink-0', activityBar[a.type] || activityBar.auth)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground">{a.user}</span> {a.action}{' '}
                    <span className="font-medium text-foreground">{a.target}</span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {a.time}{a.size !== '—' && ` · ${a.size}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Server health */}
      <Card className="mt-5 rounded-sm">
        <PanelHeader
          title="Server Health"
          subtitle="Infrastructure across regions"
          right={
            <button className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              Monitor →
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="text-eyebrow px-5 py-2.5 font-medium">Node</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Region</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">CPU</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Memory</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Disk</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Latency</th>
                <th className="text-eyebrow px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {serverHealth.map((s) => (
                <tr key={s.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-background/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-6 w-6 place-items-center border border-border text-muted-foreground"><Icon name="Server" className="h-3 w-3" /></span>
                      <span className="font-mono text-[12px] text-foreground">{s.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground md:table-cell">{s.region}</td>
                  {[
                    { v: s.cpu, label: 'CPU' },
                    { v: s.mem, label: 'MEM' },
                    { v: s.disk, label: 'DISK' },
                  ].map((m) => (
                    <td key={m.label} className="hidden px-5 py-3 md:table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="h-[3px] w-16 overflow-hidden bg-muted">
                          <div className={cn('h-full transition-all', meterColor(m.v))} style={{ width: `${m.v}%` }} />
                        </div>
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{m.v}%</span>
                      </div>
                    </td>
                  ))}
                  <td className="hidden px-5 py-3 lg:table-cell">
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{s.latency}ms</span>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <button className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
