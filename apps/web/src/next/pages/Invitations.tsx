import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import PageHeader, { StatusBadge } from '@next/components/PageHeader';
import { Card } from '@next/components/ui/card';
import { Input } from '@next/components/ui/input';
import { Button } from '@next/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@next/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@next/components/ui/dialog';
import { Label } from '@next/components/ui/label';
import { adminApi, type Invite } from '@/api/admin';
import ExportDialog, { type ExportOptions } from '@next/components/ExportDialog';
import { datedFilename, downloadCsv, withinDays } from '@next/lib/csv';
import { Search, UserPlus, RotateCw, Clock, Check, Mail, Copy, Trash2, Loader2, Lock, Send, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'];

interface ExpiryState {
  label: string;
  cls: string;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function expiryState(status: string, expiresAt: string | null, now: number): ExpiryState {
  if (!expiresAt) return { label: 'Never', cls: 'text-muted-foreground' };
  const exp = new Date(expiresAt).getTime();
  if (isNaN(exp)) return { label: '—', cls: 'text-muted-foreground' };
  if (status !== 'ACTIVE') return { label: '', cls: '' };
  const remaining = exp - now;
  if (remaining <= 0) return { label: 'Expired', cls: 'text-zinc-400' };
  const cls = remaining < 2 * 86400000 ? 'text-amber-400' : 'text-emerald-400';
  return { label: `${formatRemaining(remaining)} left`, cls };
}

/** Ticks once a second so active invites show a live countdown. */
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'Never' : d.toLocaleString();
}

const eyebrowBtn = 'h-8 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground';

export default function Invitations() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [maxUses, setMaxUses] = useState('1');
  const [expiresIn, setExpiresIn] = useState('12h');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const now = useNow();

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getInvites();
      setInvites(data);
      setForbidden(false);
    } catch (error) {
      const err = error as { response?: { status?: number; data?: unknown } };
      if (err.response?.status === 403) {
        setForbidden(true);
      } else {
        toast.error(typeof err.response?.data === 'string' ? err.response.data : 'Failed to fetch invites');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const filtered = useMemo<Invite[]>(() => {
    return invites.filter((i) => {
      const q = query.toLowerCase();
      const matches = !q
        || i.token.toLowerCase().includes(q)
        || (i.note || '').toLowerCase().includes(q);
      const statusOk = status === 'all' || i.status === status;
      return matches && statusOk;
    });
  }, [invites, query, status]);

  const stats = useMemo(() => ({
    active: invites.filter((i) => i.status === 'ACTIVE').length,
    used: invites.filter((i) => i.status === 'USED').length,
    expired: invites.filter((i) => i.status === 'EXPIRED').length,
  }), [invites]);

  const copy = (invite: Invite) => {
    navigator.clipboard.writeText(invite.token);
    setCopied(invite.id);
    toast.success('Token copied');
    setTimeout(() => setCopied(null), 1500);
  };

  const createInvite = async () => {
    setCreating(true);
    try {
      await adminApi.generateInvite({
        max_uses: parseInt(maxUses, 10) || 0,
        expires_in: expiresIn.trim(),
        note,
      });
      toast.success('Invite created');
      setOpen(false);
      setMaxUses('1');
      setExpiresIn('12h');
      setNote('');
      await fetchInvites();
    } catch (error) {
      const err = error as { response?: { data?: unknown } };
      toast.error(typeof err.response?.data === 'string' ? err.response.data : 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const deleteInvite = async (invite: Invite) => {
    if (!window.confirm(`Delete invite ${invite.token}? This cannot be undone.`)) return;
    setDeletingId(invite.id);
    try {
      await adminApi.deleteInvite(invite.id);
      toast.success('Invite deleted');
      await fetchInvites();
    } catch (error) {
      const err = error as { response?: { data?: unknown } };
      toast.error(typeof err.response?.data === 'string' ? err.response.data : 'Failed to delete invite');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = ({ statuses, sinceDays, toggle }: ExportOptions) => {
    const rows = invites
      .filter((i) => statuses.includes(i.status))
      .filter((i) => withinDays(i.created_at, sinceDays));

    if (rows.length === 0) {
      toast.error('No invites match the selected criteria');
      return;
    }

    const headers = ['ID', 'Status', 'Uses', 'Max Uses', 'Expires At', 'Created At', 'Note'];
    if (toggle) headers.splice(1, 0, 'Token');

    const data = rows.map((i) => {
      const row: (string | number)[] = [
        i.id, i.status, i.use_count,
        i.max_uses === 0 ? 'Unlimited' : i.max_uses,
        i.expires_at ? new Date(i.expires_at).toLocaleString() : 'Never',
        new Date(i.created_at).toLocaleString(),
        i.note || '',
      ];
      if (toggle) row.splice(1, 0, i.token);
      return row;
    });

    downloadCsv(datedFilename('guardian-invites-export'), headers, data);
    toast.success(`${rows.length} invites exported`);
    setExportOpen(false);
  };

  if (forbidden) {
    return (
      <div className="animate-fade-in-up">
        <PageHeader eyebrow="Access Control" title="Invitations" description="Send and track vault access invitations." />
        <Card className="rounded-sm border-border bg-card">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-2 px-6 py-20 text-center">
            <div className="grid h-11 w-11 place-items-center border border-border text-muted-foreground"><Lock className="h-4 w-4" /></div>
            <p className="text-sm font-medium text-foreground">Admin access required</p>
            <p className="text-xs text-muted-foreground">Your account does not have permission to manage invitations.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Access Control"
        title="Invitations"
        description="Send and track vault access invitations."
        badge={<span className="border border-border bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{stats.active} active</span>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className={cn(eyebrowBtn, 'gap-1.5')}><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button size="sm" className="h-8 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90" onClick={() => setOpen(true)}><UserPlus className="h-3.5 w-3.5" /> New invitation</Button>
          </>
        }
      />

      {/* Stat strip */}
      <div className="mb-5 flex flex-col divide-y divide-border border border-border bg-card sm:flex-row sm:divide-x sm:divide-y-0">
        {[
          { label: 'Active', value: stats.active, icon: Clock, cls: 'text-emerald-400' },
          { label: 'Used', value: stats.used, icon: Check, cls: 'text-sky-400' },
          { label: 'Expired', value: stats.expired, icon: Mail, cls: 'text-zinc-400' },
        ].map((s) => (
          <div key={s.label} className="flex flex-1 items-center gap-3.5 p-5">
            <span className={cn('grid h-9 w-9 place-items-center border border-border', s.cls)}><s.icon className="h-4 w-4" /></span>
            <div>
              <p className="font-heading text-2xl font-semibold leading-none tabular-nums text-foreground">{s.value}</p>
              <p className="text-eyebrow mt-1.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} placeholder="Search by token or note…" className="h-9 max-w-sm rounded-sm border-border bg-card pl-9 text-[13px]" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[148px] rounded-sm border-border bg-card font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchInvites} className={cn(eyebrowBtn, 'gap-1.5')}>
          <RotateCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden rounded-sm border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="text-eyebrow px-5 py-2.5 font-medium">Token</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Role</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Plan</th>
                <th className="text-eyebrow px-5 py-2.5 font-medium">Status</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Uses</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Sent</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Expires</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium xl:table-cell">Invited by</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="px-5 py-16 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-16 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                    <div className="grid h-11 w-11 place-items-center border border-border text-muted-foreground"><Mail className="h-4 w-4" /></div>
                    <p className="text-sm font-medium text-foreground">No invitations found</p>
                    <p className="text-xs text-muted-foreground">Send a new invitation to get started.</p>
                  </div>
                </td></tr>
              )}
              {!loading && filtered.map((i) => {
                const exp = expiryState(i.status, i.expires_at, now);
                return (
                  <tr key={i.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-background/50">
                    <td className="px-5 py-3"><code className="select-all font-mono text-[12px] text-foreground">{i.token}</code></td>
                    <td className="hidden px-5 py-3 md:table-cell"><span className="font-mono text-[11px] text-muted-foreground">—</span></td>
                    <td className="hidden px-5 py-3 lg:table-cell"><span className="font-mono text-[11px] text-muted-foreground">—</span></td>
                    <td className="px-5 py-3"><StatusBadge status={i.status} /></td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {i.use_count}{i.max_uses > 0 ? ` / ${i.max_uses}` : ' / ∞'}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground lg:table-cell">{formatDate(i.created_at)}</td>
                    <td className="hidden px-5 py-3 lg:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[11px] text-muted-foreground">{formatWhen(i.expires_at)}</span>
                        {exp.label && <span className={cn('font-mono text-[10px] uppercase tracking-wider', exp.cls)}>{exp.label}</span>}
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-[12px] text-muted-foreground xl:table-cell">—</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => copy(i)} title="Copy token" className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-primary">
                          {copied === i.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => deleteInvite(i)}
                          disabled={i.use_count > 0 || deletingId === i.id}
                          title={i.use_count > 0 ? 'Cannot delete a used invite' : 'Delete invite'}
                          className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deletingId === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Showing {filtered.length} of {invites.length} invites</span>
        </div>
      </Card>

      {/* Create invite modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-sm border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-base"><UserPlus className="h-4 w-4 text-primary" /> New invitation</DialogTitle>
            <DialogDescription className="text-[13px]">Generate an invite token others can redeem to create an account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-eyebrow">Max uses</Label>
              <Input
                type="number"
                min="0"
                value={maxUses}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxUses(e.target.value)}
                className="rounded-sm border-border bg-background text-[13px]"
              />
              <p className="font-mono text-[10px] text-muted-foreground">0 = unlimited uses.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-eyebrow">Expires in</Label>
              <Input
                value={expiresIn}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setExpiresIn(e.target.value)}
                placeholder="12h, 7d or never"
                className="rounded-sm border-border bg-background text-[13px]"
              />
              <p className="font-mono text-[10px] text-muted-foreground">Format: 30m, 12h, 7d or never.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-eyebrow">Note</Label>
              <Input
                value={note}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
                placeholder="e.g. For new team members"
                className="rounded-sm border-border bg-background text-[13px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-sm border-border bg-background font-mono text-[11px] uppercase tracking-wider" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={createInvite}
              disabled={creating}
              className="gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Create invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export invites"
        description="Filter and download invite tokens as CSV."
        statuses={STATUS_OPTIONS}
        toggleLabel="Include token in CSV"
        toggleHint="Full invite codes in the exported file"
        onExport={handleExport}
      />
    </div>
  );
}
