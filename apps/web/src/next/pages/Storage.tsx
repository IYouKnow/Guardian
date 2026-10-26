import { useMemo, type ComponentType } from 'react';
import PageHeader, { RoleBadge } from '@next/components/PageHeader';
import { Card } from '@next/components/ui/card';
import { Button } from '@next/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@next/components/ui/tabs';
import { useStorageData } from '@next/lib/useStorageData';
import { formatBytes } from '@next/lib/format';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { HardDrive, Database, Archive, FileText, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<{ className?: string }>;

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const typeIcons: Record<string, IconComponent> = {
  'Vault data': Database,
  Backups: Archive,
  Overhead: FileText,
  System: HardDrive,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLabel(month: string) {
  const [, mo] = month.split('-').map(Number);
  return MONTHS[mo - 1] ?? month;
}

const tabTrigger = 'rounded-sm font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary';

interface PieTooltipEntry { name: string; value: number; }
interface PieTooltipProps { active?: boolean; payload?: PieTooltipEntry[]; total: number; }

function PieTooltip({ active, payload, total }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="border border-border bg-popover/95 px-3 py-2 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.name}</p>
      <p className="mt-1 font-mono text-xs tabular-nums text-foreground">
        {formatBytes(p.value)}{total > 0 ? ` · ${((p.value / total) * 100).toFixed(1)}%` : ''}
      </p>
    </div>
  );
}

export default function Storage() {
  const { data, loading, refresh } = useStorageData();

  const totalUsed = data?.total_used ?? 0;
  const users = useMemo(() => data?.users ?? [], [data]);
  const breakdown = useMemo(
    () => (data?.breakdown ?? []).map((b, i) => ({ ...b, color: CHART_COLORS[i % CHART_COLORS.length] })),
    [data],
  );
  const growth = useMemo(
    () => (data?.growth ?? []).map((g) => ({ month: monthLabel(g.month), bytes: g.bytes })),
    [data],
  );

  const diskMode = data?.capacity_source === 'disk' && (data?.disk_total ?? 0) > 0;
  const denominator = diskMode ? (data?.disk_total ?? 0) : (data?.allocation_bytes ?? 0);
  const free = diskMode ? (data?.disk_free ?? 0) : Math.max(denominator - totalUsed, 0);
  const hasDenominator = denominator > 0;
  const usedPct = hasDenominator ? (totalUsed / denominator) * 100 : null;

  // When there is no denominator the stacked bar still shows the composition of
  // what is used; otherwise it shows fill against capacity.
  const barBase = hasDenominator ? denominator : (totalUsed || 1);
  const topUserBytes = users.length > 0 ? Math.max(users[0].total_bytes, 1) : 1;

  const empty = loading ? 'Loading…' : 'No data yet';

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Infrastructure"
        title="Storage"
        description="On-disk vault storage, backup archives, and per-account usage."
        badge={
          <span className="border border-border bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {usedPct != null ? `${usedPct.toFixed(1)}% used` : data ? `${users.length} vaults` : '—'}
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            className="h-8 gap-1.5 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <RotateCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </Button>
        }
      />

      {/* Overview */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="rounded-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Total Storage</h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {diskMode ? 'Against data volume capacity' : hasDenominator ? 'Against configured allocation' : 'Measured usage'}
              </p>
            </div>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-5">
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
                {data ? formatBytes(totalUsed) : '—'}
              </span>
              {hasDenominator && <span className="font-mono text-sm text-muted-foreground">/ {formatBytes(denominator)}</span>}
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{formatBytes(totalUsed)} used</span>
                <span>{hasDenominator ? `${formatBytes(free)} free` : `${users.length} vaults`}</span>
              </div>
              <div className="flex h-2.5 overflow-hidden border border-border bg-muted">
                {breakdown.map((t) => (
                  <div key={t.name} style={{ width: `${(t.bytes / barBase) * 100}%`, background: t.color }} className="h-full" />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {breakdown.map((t) => (
                  <span key={t.name} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="h-2.5 w-2.5" style={{ background: t.color }} />{t.name} · {formatBytes(t.bytes)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Breakdown</h3>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">On-disk footprint</p>
          </div>
          <div className="relative p-4">
            <ResponsiveContainer width="100%" height={188}>
              <PieChart>
                <Pie data={breakdown} dataKey="bytes" nameKey="name" innerRadius={54} outerRadius={80} paddingAngle={2} stroke="none">
                  {breakdown.map((t) => <Cell key={t.name} fill={t.color} />)}
                </Pie>
                <Tooltip content={<PieTooltip total={totalUsed} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">{data ? formatBytes(totalUsed) : '—'}</span>
              <span className="text-eyebrow mt-0.5">used</span>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-5">
        <TabsList className="h-auto gap-1 rounded-sm border-border bg-card p-1">
          <TabsTrigger value="users" className={tabTrigger}>Per-user usage</TabsTrigger>
          <TabsTrigger value="growth" className={tabTrigger}>Snapshot growth</TabsTrigger>
          <TabsTrigger value="types" className={tabTrigger}>By category</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="overflow-hidden rounded-sm border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Per-user storage usage</h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Vault database + WAL/SHM overhead</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="text-eyebrow px-5 py-2.5 font-medium">User</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Role</th>
                    <th className="text-eyebrow px-5 py-2.5 font-medium">Usage</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Overhead</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{empty}</td>
                    </tr>
                  )}
                  {users.map((u) => {
                    const nearCap = hasDenominator && u.total_bytes / denominator >= 0.8;
                    return (
                      <tr key={u.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-background/50">
                        <td className="px-5 py-3 text-[13px] font-medium text-foreground">{u.friendly_name || u.username}</td>
                        <td className="hidden px-5 py-3 md:table-cell"><RoleBadge role={u.role} /></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-[3px] w-32 overflow-hidden bg-muted">
                              <div className={cn('h-full', nearCap ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${(u.total_bytes / topUserBytes) * 100}%` }} />
                            </div>
                            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{formatBytes(u.total_bytes)}</span>
                          </div>
                        </td>
                        <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground lg:table-cell">{formatBytes(u.overhead_bytes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <Card className="rounded-sm border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Snapshot storage</h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Cumulative backup archive size · 6 months</p>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={288}>
                <BarChart data={growth} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" strokeOpacity={0.6} vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'JetBrains Mono' }} dy={8} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(Number(v))} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'JetBrains Mono' }} width={64} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--primary))', fillOpacity: 0.05 }}
                    formatter={(v) => [formatBytes(Number(v)), 'Archives']}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 2, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <Bar dataKey="bytes" fill="hsl(var(--primary))" fillOpacity={0.85} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="types">
          {breakdown.length === 0 ? (
            <div className="border border-border bg-card px-5 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{empty}</div>
          ) : (
            <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {breakdown.map((t) => {
                const I: IconComponent = typeIcons[t.name] || HardDrive;
                const pct = totalUsed > 0 ? ((t.bytes / totalUsed) * 100).toFixed(1) : '0.0';
                return (
                  <div key={t.name} className="group bg-card p-5 transition-colors hover:bg-background/40">
                    <div className="flex items-start justify-between">
                      <div className="grid h-9 w-9 place-items-center border border-border" style={{ color: t.color }}><I className="h-4 w-4" /></div>
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                    <p className="mt-4 font-heading text-2xl font-semibold tabular-nums text-foreground">{formatBytes(t.bytes)}</p>
                    <p className="text-eyebrow mt-1">{t.name}</p>
                    <div className="mt-4 h-[3px] overflow-hidden bg-muted">
                      <div className="h-full" style={{ width: `${pct}%`, background: t.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
