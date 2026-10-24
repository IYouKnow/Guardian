import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@next/components/ui/dialog';
import { MockBadge } from '@next/components/MockBadge';
import { useBackupsData } from '@next/lib/useBackupsData';
import { useSSE } from '@/hooks/useSSE';
import { formatBytes, formatRelativeTime } from '@next/lib/format';
import { adminApi, type BackupDestination, type BackupRecord, type BackupSchedule } from '@/api/admin';
import { userBackupApi } from '@/api/backups';
import { authApi } from '@/api/auth';
import { Icon } from '@next/components/Icon';
import { Plus, Server, Calendar, MoreHorizontal, Zap, Trash2, Loader2, Archive, AlertTriangle, Info, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const tabTrigger = 'rounded-sm font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary';
const eyebrowBtn = 'h-8 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground';
const primaryBtn = 'h-8 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90';
const countPill = 'border border-border bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground';

// Must match minBackupKeyLength on the server.
const MIN_BACKUP_KEY_LENGTH = 12;
const DEFAULT_DRIVE_FOLDER = 'Guardian Backups';

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

// The loopback redirect Google permits for a bundled Desktop client means the
// one-time connect click must run on the server's own machine.
function isLoopbackOrigin(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
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

interface RemoteDestinationProps {
  destination: BackupDestination | null;
  loading: boolean;
  onChanged: () => Promise<void>;
}

// Live Google Drive destination: connect (via a settings dialog), pause/resume
// and disconnect.
function RemoteDestination({ destination, loading, onChanged }: RemoteDestinationProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupKey, setBackupKey] = useState('');
  const [folderName, setFolderName] = useState('');
  const [revealKey, setRevealKey] = useState(false);

  const connected = destination?.connected ?? false;
  const encrypted = destination?.encrypted ?? false;
  const clientConfigured = destination?.client_configured ?? false;
  const loopback = isLoopbackOrigin();
  const trimmedKey = backupKey.trim();
  const keyTooShort = trimmedKey.length > 0 && trimmedKey.length < MIN_BACKUP_KEY_LENGTH;

  const openDialog = () => {
    setBackupKey('');
    setFolderName(destination?.folder_name ?? '');
    setRevealKey(false);
    setDialogOpen(true);
  };

  const connect = async () => {
    if (keyTooShort) return;
    setConnecting(true);
    try {
      const { auth_url } = await adminApi.startGoogleOAuth({
        backup_key: trimmedKey || undefined,
        folder_name: folderName.trim() || undefined,
      });
      window.location.href = auth_url;
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to start the Google Drive connection'));
      setConnecting(false);
    }
  };

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      await adminApi.setBackupDestination(next);
      toast.success(next ? 'Google Drive backups enabled' : 'Google Drive backups paused');
      await onChanged();
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to update the destination'));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await adminApi.disconnectBackupDestination();
      toast.success('Google Drive disconnected');
      await onChanged();
    } catch {
      toast.error('Failed to disconnect Google Drive');
    } finally {
      setBusy(false);
    }
  };

  const details = [
    { k: 'Account', v: destination?.account_email || (connected ? '—' : 'Not connected') },
    { k: 'Folder', v: destination?.folder_name || '—' },
    { k: 'Encryption', v: connected ? (encrypted ? 'Your backup key' : 'None') : '—', cls: connected && !encrypted ? 'text-amber-400' : undefined },
    { k: 'Last sync', v: destination?.last_sync ? formatRelativeTime(destination.last_sync) : 'Never' },
  ];

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-eyebrow">Remote destination</h2>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Snapshots stay on this server · optional encrypted copy to Drive</span>
      </div>

      <Card className="rounded-sm border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <div className="grid h-9 w-9 place-items-center border border-border text-primary"><Icon name="HardDrive" className="h-4 w-4" /></div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Google Drive</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Offsite snapshot mirror</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {loading && destination === null ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <StatusBadge status={connected ? 'connected' : 'disconnected'} />
                {connected && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {destination?.enabled ? 'Enabled' : 'Paused'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {details.map((d) => (
              <div key={d.k} className="bg-card p-3.5">
                <p className="text-eyebrow">{d.k}</p>
                <p className={cn('mt-1.5 truncate text-[12px] font-medium text-foreground', d.cls)} title={d.v}>{d.v}</p>
              </div>
            ))}
          </div>

          {connected && !encrypted && (
            <div className="flex items-start gap-2.5 border border-amber-500/35 bg-amber-500/[0.06] p-3.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="text-[13px] font-medium text-foreground">Uploads are not encrypted</p>
                <p className="mt-0.5 text-xs text-muted-foreground">No backup key is set, so snapshots are uploaded as-is. They contain the server database (account hashes and invite tokens); vault secrets stay end-to-end encrypted. Disconnect and reconnect to set a key.</p>
              </div>
            </div>
          )}

          {connected && destination?.last_error && (
            <div className="flex items-start gap-2.5 border border-rose-500/35 bg-rose-500/[0.06] p-3.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div>
                <p className="text-[13px] font-medium text-foreground">Last upload failed</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{destination.last_error}</p>
              </div>
            </div>
          )}

          {!connected && !clientConfigured && (
            <div className="flex items-start gap-2.5 border border-amber-500/35 bg-amber-500/[0.06] p-3.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="text-[13px] font-medium text-foreground">Add your Google OAuth client first</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Set the client ID and secret in{' '}
                  <Link to="/settings" className="text-foreground underline underline-offset-2">Settings → Backup &amp; Sync</Link>
                  , then connect here.
                </p>
              </div>
            </div>
          )}

          {!connected && !loopback && (
            <div className="flex items-start gap-2.5 border border-border bg-background/50 p-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[13px] font-medium text-foreground">Connect from the server machine</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Google only allows this one-time step over loopback. Open{' '}
                  <span className="font-mono text-[11px] text-foreground">http://127.0.0.1:{window.location.port || '8080'}/backups</span>{' '}
                  on the host running Guardian, then click connect.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            {!connected ? (
              <Button size="sm" onClick={openDialog} disabled={!clientConfigured} className={primaryBtn}>
                <Icon name="Cloud" className="h-3.5 w-3.5" /> Connect Google Drive
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Switch checked={destination?.enabled ?? false} disabled={busy} onCheckedChange={toggle} />
                  <div>
                    <p className="text-[13px] font-medium text-foreground">Mirror snapshots</p>
                    <p className="text-xs text-muted-foreground">Upload every backup to Drive when it is created.</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button disabled={busy} className="ml-auto grid h-8 w-8 place-items-center border border-border text-muted-foreground transition-colors hover:text-foreground">
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-sm border-border bg-card">
                    <DropdownMenuItem
                      onSelect={() => disconnect()}
                      className="gap-2 font-mono text-[11px] uppercase tracking-wider text-rose-400 focus:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Disconnect Google Drive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!connecting) setDialogOpen(open); }}>
        <DialogContent className="rounded-sm border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-[15px] uppercase tracking-[0.08em] text-foreground">Connect Google Drive</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Guardian handles the Google side — you only approve access on Google's consent screen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-eyebrow">Folder name</Label>
              <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder={DEFAULT_DRIVE_FOLDER} className="h-9 rounded-sm border-border bg-background text-[13px]" />
              <p className="font-mono text-[10px] text-muted-foreground">Created in your Drive if it does not already exist.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-eyebrow">Backup key (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type={revealKey ? 'text' : 'password'}
                  value={backupKey}
                  onChange={(e) => setBackupKey(e.target.value)}
                  placeholder="Leave empty to upload unencrypted"
                  className="h-9 rounded-sm border-border bg-background font-mono text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setRevealKey((v) => !v)}
                  className="grid h-9 w-9 shrink-0 place-items-center border border-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  {revealKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">Seals each upload before it leaves this host (at least {MIN_BACKUP_KEY_LENGTH} characters). Keep it safe — an encrypted upload cannot be read without it.</p>
            </div>

            {!trimmedKey && (
              <div className="flex items-start gap-2.5 border border-amber-500/35 bg-amber-500/[0.06] p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs text-muted-foreground">Without a key the snapshot is uploaded <span className="text-foreground">unencrypted</span>, carrying the server database (account hashes, invite tokens). Vault secrets stay end-to-end encrypted either way.</p>
              </div>
            )}

            {keyTooShort && (
              <p className="text-xs text-rose-400">The backup key must be at least {MIN_BACKUP_KEY_LENGTH} characters.</p>
            )}

            {!loopback && (
              <div className="flex items-start gap-2.5 border border-border bg-background/50 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Google only allows this one-time step over loopback. Open <span className="font-mono text-[11px] text-foreground">http://127.0.0.1:{window.location.port || '8080'}/backups</span> on the host running Guardian to continue.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={connecting} className={eyebrowBtn}>Cancel</Button>
            <Button size="sm" onClick={connect} disabled={connecting || keyTooShort} className={primaryBtn}>
              {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon name="Cloud" className="h-3.5 w-3.5" />} Continue to Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BackupHistoryTableProps {
  rows: BackupRecord[];
  loading: boolean;
  // Admins see the remote (Google Drive) upload column; users' snapshots never
  // upload, so it is hidden for them.
  showDrive: boolean;
  pendingId: number | null;
  onDelete: (id: number) => void;
}

function BackupHistoryTable({ rows, loading, showDrive, pendingId, onDelete }: BackupHistoryTableProps) {
  const colSpan = showDrive ? 9 : 8;
  return (
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
              {showDrive && <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Drive</th>}
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
                {showDrive && <td className="hidden px-5 py-3 md:table-cell"><DriveBadge status={b.remote_status} /></td>}
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

export default function Backups() {
  const isAdmin = authApi.isAdmin();
  const { backups, schedules, destination, loading, refresh } = useBackupsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lastEvent } = useSSE();

  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

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
      const rec = isAdmin ? await adminApi.createBackup() : await userBackupApi.create();
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
      if (isAdmin) {
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

  // Regular users get a scoped view: only their own vault snapshots, with no
  // schedules or remote destination. Admins keep the full server-wide page.
  if (!isAdmin) {
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

        <BackupHistoryTable rows={rows} loading={loading} showDrive={false} pendingId={pendingId} onDelete={deleteBackup} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Infrastructure"
        title="Backups"
        description="Snapshot the local vault databases to disk, and optionally mirror an encrypted copy to Google Drive."
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

      <RemoteDestination destination={destination} loading={loading} onChanged={refresh} />

      <Tabs defaultValue="history" className="space-y-5">
        <TabsList className="h-auto gap-1 rounded-sm border-border bg-card p-1">
          <TabsTrigger value="history" className={tabTrigger}>Backup history</TabsTrigger>
          <TabsTrigger value="schedules" className={tabTrigger}>Schedules</TabsTrigger>
          <TabsTrigger value="retention" className={tabTrigger}>Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <BackupHistoryTable rows={rows} loading={loading} showDrive pendingId={pendingId} onDelete={deleteBackup} />
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
