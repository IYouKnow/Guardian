import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import PageHeader, { StatusBadge, RoleBadge } from '@next/components/PageHeader';
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
import { Avatar, AvatarFallback } from '@next/components/ui/avatar';
import { adminApi, type AdminUser } from '@/api/admin';
import ExportDialog, { type ExportOptions } from '@next/components/ExportDialog';
import { datedFilename, downloadCsv, withinDays } from '@next/lib/csv';
import { Search, Plus, RotateCw, MoreHorizontal, Mail, Shield, HardDrive, Folder, Calendar, Download, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ROLE_OPTIONS = ['Admin', 'User'];
const STATUS_OPTIONS = ['ACTIVE', 'DISABLED', 'SUSPENDED'];

const displayName = (u: AdminUser) => u.friendly_name || u.username;
const initials = (u: AdminUser) => displayName(u).slice(0, 2).toUpperCase();

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

const eyebrowBtn = 'h-8 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground';

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [roleDraft, setRoleDraft] = useState('User');
  const [statusDraft, setStatusDraft] = useState('ACTIVE');
  const [wsDraft, setWsDraft] = useState('0');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
      setForbidden(false);
    } catch (error) {
      const err = error as { response?: { status?: number; data?: unknown } };
      if (err.response?.status === 403) {
        setForbidden(true);
      } else {
        toast.error(typeof err.response?.data === 'string' ? err.response.data : 'Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (selected) {
      setRoleDraft(selected.role || 'User');
      setStatusDraft(selected.status || 'ACTIVE');
      setWsDraft(String(selected.max_ws_per_ip ?? 0));
    }
  }, [selected]);

  const filtered = useMemo<AdminUser[]>(() => {
    return users.filter((u) => {
      const q = query.toLowerCase();
      const matches = !q
        || u.username.toLowerCase().includes(q)
        || (u.friendly_name || '').toLowerCase().includes(q);
      const roleOk = role === 'all' || u.role === role;
      const statusOk = status === 'all' || u.status === status;
      return matches && roleOk && statusOk;
    });
  }, [users, query, role, status]);

  const saveUser = async (payload: { role?: string; status?: string; max_ws_per_ip?: number }) => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminApi.updateUser(selected.id, payload);
      toast.success('User updated');
      setSelected(null);
      await fetchUsers();
    } catch (error) {
      const err = error as { response?: { data?: unknown } };
      toast.error(typeof err.response?.data === 'string' ? err.response.data : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = ({ statuses, sinceDays, toggle }: ExportOptions) => {
    const rows = users
      .filter((u) => statuses.includes(u.status))
      .filter((u) => withinDays(u.created_at, sinceDays));

    if (rows.length === 0) {
      toast.error('No users match the selected criteria');
      return;
    }

    const headers = ['ID', 'Username', 'Role', 'Status', 'Vault Items', 'Created At', 'Last Login'];
    if (toggle) headers.push('Friendly Name');

    const data = rows.map((u) => {
      const row: (string | number)[] = [
        u.id, u.username, u.role, u.status, u.vault_items,
        new Date(u.created_at).toLocaleString(),
        u.last_login ? new Date(u.last_login).toLocaleString() : 'Never',
      ];
      if (toggle) row.push(u.friendly_name || '');
      return row;
    });

    downloadCsv(datedFilename('guardian-users-export'), headers, data);
    toast.success(`${rows.length} users exported`);
    setExportOpen(false);
  };

  if (forbidden) {
    return (
      <div className="animate-fade-in-up">
        <PageHeader eyebrow="Access Control" title="Users" description="Manage vault members, roles, and access." />
        <Card className="rounded-sm border-border bg-card">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-2 px-6 py-20 text-center">
            <div className="grid h-11 w-11 place-items-center border border-border text-muted-foreground"><Lock className="h-4 w-4" /></div>
            <p className="text-sm font-medium text-foreground">Admin access required</p>
            <p className="text-xs text-muted-foreground">Your account does not have permission to manage users.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow="Access Control"
        title="Users"
        description="Manage vault members, roles, and access."
        badge={<span className="border border-border bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{users.length} total</span>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className={cn(eyebrowBtn, 'gap-1.5')}><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button size="sm" className="h-8 gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> New user</Button>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Search by name or username…"
            className="h-9 max-w-sm rounded-sm border-border bg-card pl-9 text-[13px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9 w-[128px] rounded-sm border-border bg-card font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[138px] rounded-sm border-border bg-card font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchUsers} className={cn(eyebrowBtn, 'gap-1.5')}>
            <RotateCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden rounded-sm border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="text-eyebrow px-5 py-2.5 font-medium">User</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium md:table-cell">Role</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Plan</th>
                <th className="text-eyebrow px-5 py-2.5 font-medium">Status</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium lg:table-cell">Storage</th>
                <th className="text-eyebrow hidden px-5 py-2.5 font-medium xl:table-cell">Last active</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-5 py-16 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-16 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                    <div className="grid h-11 w-11 place-items-center border border-border text-muted-foreground"><Search className="h-4 w-4" /></div>
                    <p className="text-sm font-medium text-foreground">No users found</p>
                    <p className="text-xs text-muted-foreground">Try adjusting your search or filters.</p>
                  </div>
                </td></tr>
              )}
              {!loading && filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-background/50"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-none border border-border"><AvatarFallback className="rounded-none bg-primary/10 font-mono text-[10px] font-semibold text-primary">{initials(u)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-foreground">{displayName(u)}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 md:table-cell"><RoleBadge role={u.role} /></td>
                  <td className="hidden px-5 py-3 lg:table-cell"><span className="font-mono text-[11px] text-muted-foreground">—</span></td>
                  <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                  <td className="hidden px-5 py-3 lg:table-cell">
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{u.used_space || '—'}</span>
                  </td>
                  <td className="hidden px-5 py-3 font-mono text-[11px] text-muted-foreground xl:table-cell">{formatWhen(u.last_login)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setSelected(u); }}
                      className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                    ><MoreHorizontal className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Showing {filtered.length} of {users.length} users</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className={eyebrowBtn}>Previous</Button>
            <Button variant="outline" size="sm" className={eyebrowBtn}>Next</Button>
          </div>
        </div>
      </Card>

      {/* Detail / edit modal */}
      <Dialog open={!!selected} onOpenChange={(o: boolean) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg rounded-sm border-border bg-card p-0">
          {selected && (
            <>
              <div className="relative h-16 overflow-hidden border-b border-border bg-muted/40">
                <div className="absolute inset-0 grid-texture-fine opacity-60" />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">User Record</span>
              </div>
              <DialogHeader className="px-6 pt-5">
                <div className="flex items-end gap-4">
                  <Avatar className="h-14 w-14 rounded-none border border-border bg-card"><AvatarFallback className="rounded-none bg-primary/10 font-mono text-base font-semibold text-primary">{initials(selected)}</AvatarFallback></Avatar>
                  <div className="pb-0.5">
                    <DialogTitle className="font-heading text-lg">{displayName(selected)}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 font-mono text-[11px]">
                      <Mail className="h-3 w-3" /> {selected.username}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-px border-y border-border bg-border">
                {[
                  { label: 'Role', value: selected.role || '—', icon: Shield },
                  { label: 'Vault items', value: String(selected.vault_items ?? 0), icon: Folder },
                  { label: 'Joined', value: formatDate(selected.created_at), icon: Calendar },
                ].map((s) => (
                  <div key={s.label} className="bg-card p-3.5">
                    <div className="flex items-center gap-1.5 text-eyebrow"><s.icon className="h-3 w-3" />{s.label}</div>
                    <p className="mt-1.5 text-sm font-medium text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 px-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-eyebrow">Role</Label>
                    <Select value={roleDraft} onValueChange={setRoleDraft}>
                      <SelectTrigger className="h-9 rounded-sm border-border bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-eyebrow">Status</Label>
                    <Select value={statusDraft} onValueChange={setStatusDraft}>
                      <SelectTrigger className="h-9 rounded-sm border-border bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-eyebrow">WebSocket limit (per IP)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={wsDraft}
                    onChange={(e) => setWsDraft(e.target.value)}
                    className="h-9 w-28 rounded-sm border-border bg-background text-center font-mono text-[13px]"
                  />
                  <p className="font-mono text-[10px] text-muted-foreground">0 = use the global default from Server settings.</p>
                </div>
                <div className="border border-border bg-background/50 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-eyebrow"><HardDrive className="h-3.5 w-3.5" /> Storage used</span>
                    <span className="font-mono text-[11px] tabular-nums text-foreground">{selected.used_space || '—'}</span>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">Last login: {formatWhen(selected.last_login)}</p>
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-border px-6 py-4">
                <Button
                  variant="outline"
                  disabled={saving || selected.status === 'SUSPENDED'}
                  onClick={() => saveUser({ status: 'SUSPENDED' })}
                  className="rounded-sm border-border bg-background font-mono text-[11px] uppercase tracking-wider text-rose-400 hover:text-rose-300"
                >
                  Suspend
                </Button>
                <Button
                  onClick={() => saveUser({ role: roleDraft, status: statusDraft, max_ws_per_ip: parseInt(wsDraft, 10) || 0 })}
                  disabled={saving}
                  className="rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save changes'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export users"
        description="Filter and download the user list as CSV."
        statuses={STATUS_OPTIONS}
        toggleLabel="Include friendly names"
        toggleHint="Personal identifiers in the export"
        onExport={handleExport}
      />
    </div>
  );
}
