import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader, { StatusBadge } from '@next/components/PageHeader';
import MetricRail, { type MetricRailItem } from '@next/components/MetricRail';
import { RemoteDestination } from '@next/components/RemoteDestination';
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
import { useBackupsData, type BackupsVariant } from '@next/lib/useBackupsData';
import { useSSE } from '@/hooks/useSSE';
import { formatBytes, formatRelativeTime } from '@next/lib/format';
import { downloadBlob } from '@next/lib/csv';
import { adminApi, type BackupRecord, type BackupSchedule } from '@/api/admin';
import { userBackupApi } from '@/api/backups';
import { authApi } from '@/api/auth';
import { Plus, Server, Calendar, MoreHorizontal, Zap, Trash2, Loader2, Archive, AlertTriangle, Search, RotateCw, Download } from 'lucide-react';
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

function errorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: unknown } };
  return typeof err.response?.data === 'string' ? err.response.data : fallback;
}

function DriveBadge({ status }: { status: string }) {
  if (!status) return <span className="font-mono text-[11px] text-muted-foreground/40">—</span>;
  const styles: Record<string, string> = {
    uploaded: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-400',
    pending: 'border-amber-500/35 bg-amber-500/[0.08] text-amber-400',
    failed: 'border-rose-500/35 bg-rose-500/[0.08] text-rose-400',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 border px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider', styles[status] ?? 'border-border bg-muted text-muted-foreground')}>
      {status}
    </span>
  );
}

const filterTrigger = 'h-9 rounded-sm border-border bg-card font-mono text-[11px] uppercase tracking-wider text-muted-foreground';

interface HistoryToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
  drive: string;
  onDriveChange: (value: string) => void;
  // The Drive column only exists in the admin view, so its filter follows suit.
  showDrive: boolean;
  loading: boolean;
  onRefresh: () => void;
}

// Client-side search + filters over the already-loaded history rows.
function HistoryToolbar({
  query, onQueryChange, status, onStatusChange, source, onSourceChange,
  drive, onDriveChange, showDrive, loading, onRefresh,
}: HistoryToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by filename or owner…"
          className="h-9 max-w-sm rounded-sm border-border bg-card pl-9 text-[13px]"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className={cn(filterTrigger, 'w-[132px]')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={onSourceChange}>
          <SelectTrigger className={cn(filterTrigger, 'w-[128px]')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="schedule">Scheduled</SelectItem>
          </SelectContent>
        </Select>
        {showDrive && (
          <Select value={drive} onValueChange={onDriveChange}>
            <SelectTrigger className={cn(filterTrigger, 'w-[132px]')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Drive</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Drive failed</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" onClick={onRefresh} className={cn(eyebrowBtn, 'gap-1.5')}>
          <RotateCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>
    </div>
  );
}

interface BackupHistoryTableProps {
  rows: BackupRecord[];
  // Total rows before filtering, so an empty filtered table reads differently.
  totalCount: number;
  loading: boolean;
  // The admin view lists every user's snapshots, so it shows the owner and Drive
  // columns; the personal view shows only the caller's own vault.
  variant: 'personal' | 'admin';
  pendingId: number | null;
  downloadingId: number | null;
  onDelete: (id: number) => void;
  onDownload: (rec: BackupRecord) => void;
}

function BackupHistoryTable({ rows, totalCount, loading, variant, pendingId, downloadingId, onDelete, onDownload }: BackupHistoryTableProps) {
  const admin = variant === 'admin';
  const colSpan = admin ? 10 : 8;
  return (
    <Card className="overflow-hidden rounded-sm border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="text-eyebrow px-5 py-2.5 font-medium">Backup</th>
              {admin && <th className="text-eyebrow px-5 py-2.5 font-medium">Owner</th>}
              <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Source</th>
              <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Vaults</th>
              <th className="text-eyebrow px-5 py-2.5 font-medium">Size</th>
              <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Duration</th>
              <th className="text-eyebrow px-5 py-2.5 font-medium">Status</th>
              {admin && <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Drive</th>}
              <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Time</th>
              <th className="px-5 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={colSpan} className="px-5 py-16 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={colSpan} className="px-5 py-16 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                  <div className="grid h-11 w-11 place-items-center border border-border text-muted-foreground"><Archive className="h-4 w-4" /></div>
                  <p className="text-sm font-medium text-foreground">{totalCount > 0 ? 'No matching backups' : 'No backups yet'}</p>
                  <p className="text-xs text-muted-foreground">{totalCount > 0 ? 'Try a different search or filter.' : 'Create your first snapshot to see it here.'}</p>
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
                {admin && <td className="px-5 py-3"><span className="font-mono text-[11px] text-muted-foreground">{b.owner || 'Server'}</span></td>}
                <td className="hidden px-5 py-3 text-[12px] capitalize text-muted-foreground md:table-cell">{b.trigger === 'schedule' ? 'Scheduled' : 'Manual'}</td>
                <td className="hidden px-5 py-3 font-mono text-[11px] tabular-nums text-muted-foreground lg:table-cell">{b.vaults}</td>
                <td className="px-5 py-3 font-mono text-[11px] tabular-nums text-foreground">{formatBytes(b.size)}</td>
                <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground lg:table-cell">{formatDuration(b.duration_ms)}</td>
                <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                {admin && <td className="hidden px-5 py-3 md:table-cell"><DriveBadge status={b.remote_status} /></td>}
                <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground lg:table-cell">{formatRelativeTime(b.created_at)}</td>
                <td className="px-5 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button disabled={pendingId === b.id || downloadingId === b.id} className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-foreground">
                        {pendingId === b.id || downloadingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-sm border-border bg-card">
                      <DropdownMenuItem
                        disabled={!b.filename}
                        onSelect={() => onDownload(b)}
                        className="gap-2 font-mono text-[11px] uppercase tracking-wider focus:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onDelete(b.id)}
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
  );
}

export default function Backups({ variant }: { variant: BackupsVariant }) {
  const isAdminView = variant === 'admin';
  const { backups, schedules, destination, loading, refresh } = useBackupsData(variant);
  const [searchParams, setSearchParams] = useSearchParams();
  const { lastEvent } = useSSE();

  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [driveFilter, setDriveFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInterval, setNewInterval] = useState('1440');
  const [newRetention, setNewRetention] = useState('30');
  const [creatingSchedule, setCreatingSchedule] = useState(false);

  // Surface the outcome of the Google OAuth redirect, then strip the query so a
  // refresh does not repeat the toast.
  useEffect(() => {
    const result = searchParams.get('google');
    if (!result) return;
    const reason = searchParams.get('reason');
    if (result === 'connected') {
      toast.success('Google Drive connected');
    } else {
      toast.error(reason ? `Google Drive connection failed (${reason})` : 'Google Drive connection failed');
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // The remote upload runs in the background, so refresh the history when the
  // server reports it finished.
  useEffect(() => {
    if (lastEvent?.type === 'backup_updated') refresh();
  }, [lastEvent, refresh]);

  const createBackup = async () => {
    setCreating(true);
    try {
      const rec = isAdminView ? await adminApi.createBackup() : await userBackupApi.create();
      if (rec.status === 'failed') {
        toast.error('Backup failed');
      } else {
        toast.success('Backup created');
      }
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to create backup'));
    } finally {
      setCreating(false);
    }
  };

  const deleteBackup = async (id: number) => {
    setPendingId(id);
    try {
      if (isAdminView) {
        await adminApi.deleteBackup(id);
      } else {
        await userBackupApi.remove(id);
      }
      toast.success('Backup deleted');
      await refresh();
    } catch {
      toast.error('Failed to delete backup');
    } finally {
      setPendingId(null);
    }
  };

  const downloadBackup = async (rec: BackupRecord) => {
    if (!rec.filename) return;
    setDownloadingId(rec.id);
    try {
      const blob = isAdminView ? await adminApi.downloadBackup(rec.id) : await userBackupApi.download(rec.id);
      downloadBlob(rec.filename, blob);
      toast.success('Backup downloaded');
    } catch {
      toast.error('Failed to download backup');
    } finally {
      setDownloadingId(null);
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

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (backups ?? []).filter((b) => {
      const matchesQuery = !q
        || (b.filename || '').toLowerCase().includes(q)
        || (b.owner || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || b.trigger === sourceFilter;
      const matchesDrive = !isAdminView || driveFilter === 'all' || b.remote_status === driveFilter;
      return matchesQuery && matchesStatus && matchesSource && matchesDrive;
    });
  }, [backups, query, statusFilter, sourceFilter, driveFilter, isAdminView]);

  const stats = useMemo<MetricRailItem[]>(() => {
    const list = backups ?? [];
    const total = list.length;
    const totalSize = list.reduce((acc, b) => acc + (b.size || 0), 0);
    const ok = list.filter((b) => b.status === 'success').length;
    const rate = total ? Math.round((ok / total) * 100) : 0;
    const latest = list[0]?.created_at;
    return [
      { id: 'count', label: 'Snapshots', value: String(total), sub: 'in history' },
      { id: 'size', label: 'Stored', value: formatBytes(totalSize), sub: 'on this server' },
      { id: 'rate', label: 'Success rate', value: `${rate}%`, sub: total ? `${ok} of ${total} ok` : 'no runs yet' },
      { id: 'last', label: 'Last backup', value: latest ? formatRelativeTime(latest) : '—', sub: latest ? 'most recent run' : 'none yet' },
    ];
  }, [backups]);

  const toolbar = (
    <HistoryToolbar
      query={query} onQueryChange={setQuery}
      status={statusFilter} onStatusChange={setStatusFilter}
      source={sourceFilter} onSourceChange={setSourceFilter}
      drive={driveFilter} onDriveChange={setDriveFilter}
      showDrive={isAdminView}
      loading={loading} onRefresh={refresh}
    />
  );

  // The feature is off until the operator turns it on in Settings → Backups. The
  // server refuses snapshots too, so the page only ever points at the switch.
  if (!authApi.backupsEnabled()) {
    return (
      <div className="animate-fade-in-up">
        <PageHeader
          eyebrow="Infrastructure"
          title="Backups"
          description="Server-wide snapshots and every user's vault backups."
        />
        <Card className="rounded-sm border-border bg-card">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="grid h-11 w-11 place-items-center border border-border text-muted-foreground"><AlertTriangle className="h-4 w-4" /></div>
            <p className="text-sm font-medium text-foreground">Backups are turned off</p>
            <p className="text-xs text-muted-foreground">
              Turn them on under{' '}
              <Link to="/settings" className="text-foreground underline underline-offset-2">Settings → Backups</Link>
              {' '}to start creating snapshots and to let users back up their own vault.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // The personal view is the account's own vault: no schedules, no other users'
  // snapshots. The admin view below covers all accounts.
  if (variant === 'personal') {
    return (
      <div className="animate-fade-in-up">
        <PageHeader
          eyebrow="Vault"
          title="Backups"
          description="Snapshot your encrypted vault to this server. Only your own data is included, and only you can see these backups."
          badge={<span className={countPill}>{rows.length} backups</span>}
          actions={
            <Button size="sm" onClick={createBackup} disabled={creating} className={primaryBtn}>
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />} Create backup
            </Button>
          }
        />

        <div className="mb-6"><MetricRail items={stats} /></div>

        <RemoteDestination destination={destination} loading={loading} onChanged={refresh} />

        {toolbar}

        <BackupHistoryTable
          rows={filteredRows}
          totalCount={rows.length}
          loading={loading}
          variant="personal"
          pendingId={pendingId}
          downloadingId={downloadingId}
          onDelete={deleteBackup}
          onDownload={downloadBackup}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Infrastructure"
        title="Backups"
        description="Every snapshot on this server, labelled with its owner. Each user mirrors their own vault to their own Google Drive."
        badge={
          <>
            <span className={countPill}>{rows.length} backups</span>
            <span className="inline-flex items-center gap-1.5 border border-emerald-500/35 bg-emerald-500/[0.08] px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse bg-current" /> Live
            </span>
          </>
        }
        actions={
          <Button
            size="sm"
            onClick={createBackup}
            disabled={creating}
            className={primaryBtn}
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />} Create backup
          </Button>
        }
      />

      <div className="mb-6"><MetricRail items={stats} /></div>

      <Tabs defaultValue="history" className="space-y-5">
        <TabsList className="h-auto gap-1 rounded-sm border-border bg-card p-1">
          <TabsTrigger value="history" className={tabTrigger}>Backup history</TabsTrigger>
          <TabsTrigger value="schedules" className={tabTrigger}>Schedules</TabsTrigger>
          <TabsTrigger value="retention" className={tabTrigger}>Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          {toolbar}
          <BackupHistoryTable
            rows={filteredRows}
            totalCount={rows.length}
            loading={loading}
            variant="admin"
            pendingId={pendingId}
            downloadingId={downloadingId}
            onDelete={deleteBackup}
            onDownload={downloadBackup}
          />
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
