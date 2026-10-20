import type { ComponentType } from 'react';
import PageHeader from '@next/components/PageHeader';
import { Card } from '@next/components/ui/card';
import { Button } from '@next/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@next/components/ui/tabs';
import { storageOverview, perUserQuotas } from '@next/lib/mockData';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { HardDrive, Database, Archive, FileText, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<{ className?: string }>;

const typeIcons: Record<string, IconComponent> = { Documents: FileText, Media: Database, Backups: Archive, Archives: Archive, Other: HardDrive };

const tabTrigger = 'rounded-sm font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary';

interface PieTooltipEntry {
  name: string;
  value: number;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: PieTooltipEntry[];
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="border border-border bg-popover/95 px-3 py-2 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.name}</p>
      <p className="mt-1 font-mono text-xs tabular-nums text-foreground">{p.value} TB · {((p.value / storageOverview.totalUsed) * 100).toFixed(1)}%</p>
    </div>
  );
}

export default function Storage() {
  const usedPct = ((storageOverview.totalUsed / storageOverview.totalAllocated) * 100).toFixed(1);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Infrastructure"
        title="Storage"
        description="Vault storage allocation, usage, and quotas."
        badge={<span className="border border-border bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{usedPct}% used</span>}
        actions={<Button size="sm" className="h-8 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90">Optimize</Button>}
      />

      {/* Overview */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="rounded-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Total Storage</h3>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-5">
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{storageOverview.totalUsed}</span>
              <span className="font-mono text-sm text-muted-foreground">/ {storageOverview.totalAllocated} TB</span>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{storageOverview.totalUsed} TB used</span>
                <span>{storageOverview.totalAllocated - storageOverview.totalUsed} TB free</span>
              </div>
              <div className="flex h-2.5 overflow-hidden border border-border bg-muted">
                {storageOverview.byType.map((t) => (
                  <div key={t.name} style={{ width: `${(t.value / storageOverview.totalAllocated) * 100}%`, background: t.color }} className="h-full" />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {storageOverview.byType.map((t) => (
                  <span key={t.name} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="h-2.5 w-2.5" style={{ background: t.color }} />{t.name} · {t.value} TB
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Breakdown</h3>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">By content type</p>
          </div>
          <div className="relative p-4">
            <ResponsiveContainer width="100%" height={188}>
              <PieChart>
                <Pie data={storageOverview.byType} dataKey="value" nameKey="name" innerRadius={54} outerRadius={80} paddingAngle={2} stroke="none">
                  {storageOverview.byType.map((t) => <Cell key={t.name} fill={t.color} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">{storageOverview.totalUsed}</span>
              <span className="text-eyebrow mt-0.5">TB used</span>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="quotas" className="space-y-5">
        <TabsList className="h-auto gap-1 rounded-sm border-border bg-card p-1">
          <TabsTrigger value="quotas" className={tabTrigger}>Per-user quotas</TabsTrigger>
          <TabsTrigger value="growth" className={tabTrigger}>Growth trend</TabsTrigger>
          <TabsTrigger value="types" className={tabTrigger}>By type</TabsTrigger>
        </TabsList>

        <TabsContent value="quotas">
          <Card className="overflow-hidden rounded-sm border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Per-user storage quotas</h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Top consumers across the platform</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="text-eyebrow px-5 py-2.5 font-medium">User</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Plan</th>
                    <th className="text-eyebrow px-5 py-2.5 font-medium">Usage</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Quota</th>
                    <th className="text-eyebrow px-5 py-2.5 font-medium">% used</th>
                    <th className="px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {perUserQuotas.map((q) => (
                    <tr key={q.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-background/50">
                      <td className="px-5 py-3 text-[13px] font-medium text-foreground">{q.name}</td>
                      <td className="hidden px-5 py-3 md:table-cell"><span className="border border-border bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{q.plan}</span></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-[3px] w-32 overflow-hidden bg-muted">
                            <div className={cn('h-full', q.pct >= 60 ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${q.pct}%` }} />
                          </div>
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{q.used} TB</span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground lg:table-cell">{q.quota} TB</td>
                      <td className="px-5 py-3"><span className={cn('font-mono text-[11px] font-medium tabular-nums', q.pct >= 60 ? 'text-amber-400' : 'text-foreground')}>{q.pct}%</span></td>
                      <td className="px-5 py-3 text-right"><button className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <Card className="rounded-sm border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Storage growth</h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Cumulative usage · 6 months (TB)</p>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={288}>
                <BarChart data={storageOverview.growth} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" strokeOpacity={0.6} vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'JetBrains Mono' }} dy={8} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'JetBrains Mono' }} width={48} />
                  <Tooltip cursor={{ fill: 'hsl(var(--primary))', fillOpacity: 0.05 }} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 2, fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                  <Bar dataKey="used" fill="hsl(var(--primary))" fillOpacity={0.85} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {storageOverview.byType.map((t) => {
              const I: IconComponent = typeIcons[t.name] || HardDrive;
              const pct = ((t.value / storageOverview.totalUsed) * 100).toFixed(1);
              return (
                <div key={t.name} className="group bg-card p-5 transition-colors hover:bg-background/40">
                  <div className="flex items-start justify-between">
                    <div className="grid h-9 w-9 place-items-center border border-border" style={{ color: t.color }}><I className="h-4 w-4" /></div>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
                  </div>
                  <p className="mt-4 font-heading text-2xl font-semibold tabular-nums text-foreground">{t.value} <span className="font-mono text-sm font-normal text-muted-foreground">TB</span></p>
                  <p className="text-eyebrow mt-1">{t.name}</p>
                  <div className="mt-4 h-[3px] overflow-hidden bg-muted">
                    <div className="h-full" style={{ width: `${pct}%`, background: t.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
