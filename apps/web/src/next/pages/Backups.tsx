import { useState } from 'react';
import PageHeader, { StatusBadge } from '@next/components/PageHeader';
import { Card } from '@next/components/ui/card';
import { Button } from '@next/components/ui/button';
import { Switch } from '@next/components/ui/switch';
import { Input } from '@next/components/ui/input';
import { Label } from '@next/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@next/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@next/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@next/components/ui/dropdown-menu';
import { MockBadge } from '@next/components/MockBadge';
import { backupProviders } from '@next/lib/mockData';
import { useBackupsData } from '@next/lib/useBackupsData';
import { formatBytes, formatRelativeTime } from '@next/lib/format';
import { adminApi, type BackupSchedule } from '@/api/admin';
import { Icon } from '@next/components/Icon';
import { Plus, Clock, Server, Calendar, MoreHorizontal, Settings2, Zap, Trash2, Loader2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const tabTrigger = 'rounded-sm font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary';
const eyebrowBtn = 'h-8 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground';
const primaryBtn = 'h-8 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90';
const countPill = 'border border-border bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground';

const INTERVAL_PRESETS: { value: number; label: string }[] = [
  { value: 60, label: 'Hourly' },
  { value: 360, label: 'Every 6 hours' },
  { value: 1440, label: 'Daily' },
  { value: 10080, label: 'Weekly' },
];

function intervalLabel(minutes: number): string {
  const preset = INTERVAL_PRESETS.find((p) => p.value === minutes);
  if (preset) return preset.label;
  if (minutes % 1440 === 0) return `Every ${minutes / 1440}d`;
  if (minutes % 60 === 0) return `Every ${minutes / 60}h`;
  return `Every ${minutes}m`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function Backups() {
  const { backups, schedules, loading, refresh } = useBackupsData();

  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInterval, setNewInterval] = useState('1440');
  const [newRetention, setNewRetention] = useState('30');
  const [creatingSchedule, setCreatingSchedule] = useState(false);

  const createBackup = async () => {
    setCreating(true);
    try {
      const rec = await adminApi.createBackup();
      if (rec.status === 'failed') {
        toast.error('Backup failed');
      } else {
        toast.success('Backup created');
      }
      await refresh();
    } catch (error) {
      const err = error as { response?: { data?: unknown } };
      toast.error(typeof err.response?.data === 'string' ? err.response.data : 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const deleteBackup = async (id: number) => {
    setPendingId(id);
    try {
      await adminApi.deleteBackup(id);
      toast.success('Backup deleted');
      await refresh();
    } catch {
      toast.error('Failed to delete backup');
    } finally {
      setPendingId(null);
    }
  };

  const toggleSchedule = async (sc: BackupSchedule) => {
    setPendingId(sc.id);
    try {
      await adminApi.updateSchedule(sc.id, { enabled: !sc.enabled });
      await refresh();
    } catch {
      toast.error('Failed to update schedule');
    } finally {
      setPendingId(null);
    }
  };

  const deleteSchedule = async (sc: BackupSchedule) => {
    setPendingId(sc.id);
    try {
      await adminApi.deleteSchedule(sc.id);
      toast.success('Schedule deleted');
      await refresh();
    } catch {
      toast.error('Failed to delete schedule');
    } finally {
      setPendingId(null);
    }
  };

  const createSchedule = async () => {
    if (!newName.trim()) {
      toast.error('Name is required');
      return;
    }
    setCreatingSchedule(true);
    try {
      await adminApi.createSchedule({
        name: newName.trim(),
        interval_minutes: Number(newInterval),
        retention_days: Number(newRetention),
      });
      toast.success('Schedule created');
      setNewName('');
      setNewInterval('1440');
      setNewRetention('30');
      setShowForm(false);
      await refresh();
    } catch {
      toast.error('Failed to create schedule');
    } finally {
      setCreatingSchedule(false);
    }
  };

  const rows = backups ?? [];

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Infrastructure"
        title="Backups"
        description="Snapshot the local vault databases to disk and schedule recurring runs."
        badge={
          <>
            <span className={countPill}>{rows.length} backups</span>
            <span className="inline-flex items-center gap-1.5 border border-emerald-500/35 bg-emerald-500/[0.08] px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse bg-current" /> Live
            </span>
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              onClick={createBackup}
              disabled={creating}
              className={primaryBtn}
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />} Create backup
            </Button>
            <Button variant="outline" size="sm" disabled className={cn(eyebrowBtn, 'gap-1.5 opacity-60')}>
              <Plus className="h-3.5 w-3.5" /> Add provider
            </Button>
          </>
        }
      />

      {/* Provider cards — display-only for now */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-eyebrow">Storage providers</h2>
        <MockBadge />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Snapshots stay on this server · local disk</span>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
        {backupProviders.map((p) => (
          <div key={p.id} className="group relative bg-card p-5 opacity-80">
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
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><Clock className="h-3 w-3" /> {p.lastSync}</span>
              <button disabled className="grid h-7 w-7 place-items-center text-muted-foreground/50"><Settings2 className="h-3.5 w-3.5" /></button>
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
                    <th className="text-eyebrow px-5 py-2.5 font-medium">Backup</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Source</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Vaults</th>
                    <th className="text-eyebrow px-5 py-2.5 font-medium">Size</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Duration</th>
                    <th className="text-eyebrow px-5 py-2.5 font-medium">Status</th>
                    <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Time</th>
                    <th className="px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-16 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                        <div className="grid h-11 w-11 place-items-center border border-border text-muted-foreground"><Archive className="h-4 w-4" /></div>
                        <p className="text-sm font-medium text-foreground">No backups yet</p>
                        <p className="text-xs text-muted-foreground">Create your first snapshot to see it here.</p>
                      </div>
                    </td></tr>
                  )}
                  {rows.map((b) => (
                    <tr key={b.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-background/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-6 w-6 place-items-center border border-border text-muted-foreground"><Server className="h-3 w-3" /></span>
                          <span className="font-mono text-[12px] text-foreground">{b.filename || `backup #${b.id}`}</span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-[12px] capitalize text-muted-foreground md:table-cell">{b.trigger === 'schedule' ? 'Scheduled' : 'Manual'}</td>
                      <td className="hidden px-5 py-3 font-mono text-[11px] tabular-nums text-muted-foreground lg:table-cell">{b.vaults}</td>
                      <td className="px-5 py-3 font-mono text-[11px] tabular-nums text-foreground">{formatBytes(b.size)}</td>
                      <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground lg:table-cell">{formatDuration(b.duration_ms)}</td>
                      <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                      <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground lg:table-cell">{formatRelativeTime(b.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button disabled={pendingId === b.id} className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-foreground">
                              {pendingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-sm border-border bg-card">
                            <DropdownMenuItem
                              onSelect={() => deleteBackup(b.id)}
                              className="gap-2 font-mono text-[11px] uppercase tracking-wider text-rose-400 focus:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete backup
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-eyebrow">{(schedules ?? []).length} schedules</span>
            <Button size="sm" onClick={() => setShowForm((v) => !v)} className={cn(eyebrowBtn, 'gap-1.5')}>
              <Plus className="h-3.5 w-3.5" /> New schedule
            </Button>
          </div>

          {showForm && (
            <Card className="rounded-sm border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                <div className="grid h-9 w-9 place-items-center border border-border text-primary"><Calendar className="h-4 w-4" /></div>
                <div>
                  <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">New schedule</h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recurring snapshot of the local vaults</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label className="text-eyebrow">Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nightly backups" className="h-9 rounded-sm border-border bg-background text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-eyebrow">Frequency</Label>
                  <Select value={newInterval} onValueChange={setNewInterval}>
                    <SelectTrigger className="h-9 rounded-sm border-border bg-background font-mono text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERVAL_PRESETS.map((p) => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-eyebrow">Retention (days)</Label>
                  <Input type="number" min={1} value={newRetention} onChange={(e) => setNewRetention(e.target.value)} className="h-9 rounded-sm border-border bg-background text-center font-mono text-[13px]" />
                </div>
                <Button onClick={createSchedule} disabled={creatingSchedule} className={primaryBtn}>
                  {creatingSchedule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
                </Button>
              </div>
            </Card>
          )}

          {loading && schedules === null ? (
            <Card className="rounded-sm border-border bg-card">
              <div className="px-5 py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
            </Card>
          ) : (schedules ?? []).length === 0 ? (
            <Card className="rounded-sm border-border bg-card">
              <div className="mx-auto flex max-w-xs flex-col items-center gap-2 px-6 py-16 text-center">
                <div className="grid h-11 w-11 place-items-center border border-border text-muted-foreground"><Calendar className="h-4 w-4" /></div>
                <p className="text-sm font-medium text-foreground">No schedules</p>
                <p className="text-xs text-muted-foreground">Add one to snapshot the vaults automatically.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-px border border-border bg-border lg:grid-cols-2">
              {(schedules ?? []).map((s) => (
                <div key={s.id} className="bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center border border-border text-primary"><Calendar className="h-4 w-4" /></div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{s.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{intervalLabel(s.interval_minutes)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={s.enabled} disabled={pendingId === s.id} onCheckedChange={() => toggleSchedule(s)} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-sm border-border bg-card">
                          <DropdownMenuItem
                            onSelect={() => deleteSchedule(s)}
                            className="gap-2 font-mono text-[11px] uppercase tracking-wider text-rose-400 focus:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete schedule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      { k: 'Interval', v: intervalLabel(s.interval_minutes) },
                      { k: 'Retention', v: `${s.retention_days} days` },
                      { k: 'Last run', v: s.last_run ? formatRelativeTime(s.last_run) : 'Never' },
                      { k: 'Next run', v: s.next_run ? formatRelativeTime(s.next_run).replace(' ago', '') : '—', cls: s.enabled ? 'text-emerald-400' : 'text-zinc-400' },
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
          )}
        </TabsContent>

        <TabsContent value="retention">
          <Card className="rounded-sm border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              <div className="grid h-9 w-9 place-items-center border border-border text-primary"><Zap className="h-4 w-4" /></div>
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">Retention policy</h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">How long backups are kept before pruning</p>
                </div>
                <MockBadge />
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
                <Switch disabled />
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
