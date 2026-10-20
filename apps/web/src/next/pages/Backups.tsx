import { useState } from 'react';
import PageHeader, { StatusBadge } from '@next/components/PageHeader';
import { Card } from '@next/components/ui/card';
import { Button } from '@next/components/ui/button';
import { Switch } from '@next/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@next/components/ui/tabs';
import { backupProviders, backupHistory, backupSchedules } from '@next/lib/mockData';
import { Icon } from '@next/components/Icon';
import { Plus, RefreshCw, Clock, Server, Calendar, MoreHorizontal, Settings2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type Schedule = (typeof backupSchedules)[number];

const tabTrigger = 'rounded-sm font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary';
const eyebrowBtn = 'h-8 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground';

export default function Backups() {
  const [schedules, setSchedules] = useState<Schedule[]>(backupSchedules);

  const toggleSchedule = (id: string) => {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Infrastructure"
        title="Backups"
        description="Providers, schedules, retention, and history."
        badge={<span className="border border-border bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{backupProviders.filter((p) => p.status === 'connected').length} connected</span>}
        actions={
          <>
            <Button variant="outline" size="sm" className={cn(eyebrowBtn, 'gap-1.5')}><RefreshCw className="h-3.5 w-3.5" /> Sync all</Button>
            <Button size="sm" className="h-8 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Add provider</Button>
          </>
        }
      />

      {/* Provider cards */}
      <div className="mb-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
        {backupProviders.map((p) => (
          <div key={p.id} className="group relative bg-card p-5 transition-colors hover:bg-background/40">
            <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center border border-border text-primary"><Icon name={p.icon} className="h-4 w-4" /></div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{p.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.type}</p>
                </div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-border border border-border">
              <div className="p-2.5 text-center">
                <p className="font-mono text-[13px] font-medium tabular-nums text-foreground">{p.backups.toLocaleString()}</p>
                <p className="text-eyebrow mt-1">Backups</p>
              </div>
              <div className="p-2.5 text-center">
                <p className="font-mono text-[13px] font-medium tabular-nums text-foreground">{p.health}%</p>
                <p className="text-eyebrow mt-1">Health</p>
              </div>
              <div className="p-2.5 text-center">
                <p className="truncate font-mono text-[11px] font-medium text-foreground">{p.region}</p>
                <p className="text-eyebrow mt-1">Region</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><Clock className="h-3 w-3" /> {p.lastSync}</span>
              <button className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"><Settings2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="history" className="space-y-5">
        <TabsList className="h-auto gap-1 rounded-sm border-border bg-card p-1">
          <TabsTrigger value="history" className={tabTrigger}>Backup history</TabsTrigger>
          <TabsTrigger value="schedules" className={tabTrigger}>Schedules</TabsTrigger>
          <TabsTrigger value="retention" className={tabTrigger}>Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card className="overflow-hidden rounded-sm border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="text-eyebrow px-5 py-2.5 font-medium">Vault</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Provider</th>
                    <th className="text-eyebrow px-5 py-2.5 font-medium">Size</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Duration</th>
                    <th className="text-eyebrow px-5 py-2.5 font-medium">Status</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Time</th>
                    <th className="px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {backupHistory.map((b) => (
                    <tr key={b.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-background/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-6 w-6 place-items-center border border-border text-muted-foreground"><Server className="h-3 w-3" /></span>
                          <span className="font-mono text-[12px] text-foreground">{b.vault}</span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-[12px] text-muted-foreground md:table-cell">{b.provider}</td>
                      <td className="px-5 py-3 font-mono text-[11px] tabular-nums text-foreground">{b.size}</td>
                      <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground lg:table-cell">{b.duration}</td>
                      <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                      <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground lg:table-cell">{b.time}</td>
                      <td className="px-5 py-3 text-right"><button className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <div className="grid grid-cols-1 gap-px border border-border bg-border lg:grid-cols-2">
            {schedules.map((s) => (
              <div key={s.id} className="bg-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center border border-border text-primary"><Calendar className="h-4 w-4" /></div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{s.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{s.cron}</p>
                    </div>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={() => toggleSchedule(s.id)} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { k: 'Targets', v: s.targets },
                    { k: 'Provider', v: s.provider },
                    { k: 'Retention', v: s.retention },
                    { k: 'Status', v: s.enabled ? 'Active' : 'Paused', cls: s.enabled ? 'text-emerald-400' : 'text-zinc-400' },
                  ].map((r) => (
                    <div key={r.k}>
                      <p className="text-eyebrow">{r.k}</p>
                      <p className={cn('mt-1 text-[12px] font-medium text-foreground', r.cls)}>{r.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="retention">
          <Card className="rounded-sm border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              <div className="grid h-9 w-9 place-items-center border border-border text-primary"><Zap className="h-4 w-4" /></div>
              <div>
                <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Retention policy</h3>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">How long backups are kept before pruning</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
                {[
                  { tier: 'Hot', days: '7 days', desc: 'Immediate restore', color: 'text-rose-400' },
                  { tier: 'Warm', days: '30 days', desc: 'Standard restore', color: 'text-amber-400' },
                  { tier: 'Cold', days: '365 days', desc: 'Long-term archive', color: 'text-sky-400' },
                ].map((r) => (
                  <div key={r.tier} className="bg-card p-4">
                    <p className={cn('font-mono text-[11px] uppercase tracking-wider', r.color)}>{r.tier}</p>
                    <p className="mt-2.5 font-heading text-2xl font-semibold tabular-nums text-foreground">{r.days}</p>
                    <p className="text-eyebrow mt-1.5">{r.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 border border-border bg-background/50 p-4">
                <Switch defaultChecked />
                <div>
                  <p className="text-[13px] font-medium text-foreground">Auto-prune expired backups</p>
                  <p className="text-xs text-muted-foreground">Automatically delete backups past their retention window.</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
