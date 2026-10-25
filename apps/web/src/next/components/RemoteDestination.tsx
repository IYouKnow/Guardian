import { useState } from 'react';
import { Card } from '@next/components/ui/card';
import { Button } from '@next/components/ui/button';
import { Switch } from '@next/components/ui/switch';
import { Input } from '@next/components/ui/input';
import { Label } from '@next/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@next/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@next/components/ui/dialog';
import { StatusBadge } from '@next/components/PageHeader';
import { Icon } from '@next/components/Icon';
import { formatRelativeTime } from '@next/lib/format';
import { userBackupApi, type BackupDestination } from '@/api/backups';
import { MoreHorizontal, Loader2, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Must match minBackupKeyLength on the server.
const MIN_BACKUP_KEY_LENGTH = 12;
const DEFAULT_DRIVE_FOLDER = 'Guardian Backups';

const eyebrowBtn = 'h-8 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground';
const primaryBtn = 'h-8 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90';

function errorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: unknown } };
  return typeof err.response?.data === 'string' ? err.response.data : fallback;
}

interface RemoteDestinationProps {
  destination: BackupDestination | null;
  loading: boolean;
  onChanged: () => Promise<void>;
}

// The caller's own Google Drive destination: link the account, choose whether to
// encrypt each upload, pause/resume mirroring, and disconnect. Only the caller's
// vault snapshots are ever uploaded, and only to their own Drive.
export function RemoteDestination({ destination, loading, onChanged }: RemoteDestinationProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupKey, setBackupKey] = useState('');
  const [folderName, setFolderName] = useState('');
  const [revealKey, setRevealKey] = useState(false);

  const connected = destination?.connected ?? false;
  const encrypted = destination?.encrypted ?? false;
  const clientConfigured = destination?.client_configured ?? false;
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
      const { auth_url } = await userBackupApi.startGoogleOAuth({
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
      await userBackupApi.setDestination(next);
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
      await userBackupApi.disconnectDestination();
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
        <h2 className="text-eyebrow">Your Google Drive</h2>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Optional offsite copy of your own vault snapshots</span>
      </div>

      <Card className="rounded-sm border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <div className="grid h-9 w-9 place-items-center border border-border text-primary"><Icon name="Cloud" className="h-4 w-4" /></div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Google Drive</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Your own account · your data only</p>
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
                <p className="mt-0.5 text-xs text-muted-foreground">No backup key is set, so snapshots are uploaded as-is. They contain your vault database; the vault secrets inside stay end-to-end encrypted. Disconnect and reconnect to set a key.</p>
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
            <div className="flex items-start gap-2.5 border border-border bg-background/50 p-3.5">
              <Icon name="Cloud" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[13px] font-medium text-foreground">Google Drive is not set up on this server</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Ask your administrator to configure it in Settings → Backups. Local snapshots keep working without it.</p>
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
                    <p className="text-[13px] font-medium text-foreground">Mirror my snapshots</p>
                    <p className="text-xs text-muted-foreground">Upload each new snapshot to your Drive when it is created.</p>
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
              You approve access on Google's consent screen. Only files Guardian creates in your Drive are visible to it.
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
                <p className="text-xs text-muted-foreground">Without a key the snapshot is uploaded <span className="text-foreground">unencrypted</span>, carrying your vault database. Vault secrets stay end-to-end encrypted either way.</p>
              </div>
            )}

            {keyTooShort && (
              <p className="text-xs text-rose-400">The backup key must be at least {MIN_BACKUP_KEY_LENGTH} characters.</p>
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

export default RemoteDestination;
