import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Trash2,
  Loader2,
  ArrowUpDown,
  ChevronDown,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, type Invite } from '@/api/admin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import DeleteInviteModal from './DeleteInviteModal';
import { useTheme } from '../../context/ThemeContext';

function CountdownTimer({ expiresAt, status }: { expiresAt: string | null, status: string }) {
  const { themeClasses, accentClasses } = useTheme();
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt || status !== 'ACTIVE') {
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const distance = expiry - now;

      if (isNaN(distance) || distance <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(' '));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, status]);

  if (!expiresAt) return <span className={`${themeClasses.textTertiary}`}>-</span>;
  if (status !== 'ACTIVE' || !timeLeft) {
    if (status === 'EXPIRED') {
      return (
        <div className={`inline-flex items-center px-2.5 py-1 ${themeClasses.inputBg} border border-red-500/10 rounded-md shadow-inner`}>
          <span className="font-mono text-[11px] tracking-wider text-red-500/80 font-medium whitespace-nowrap">
            {new Date(expiresAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
      );
    }
    return (
      <span className={`${themeClasses.textSecondary}`}>
        {new Date(expiresAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center px-2.5 py-1 ${themeClasses.inputBg} border ${themeClasses.border} rounded-md shadow-inner`}>
      <span className={`font-mono text-[11px] tracking-wider ${accentClasses.textClass} font-medium whitespace-nowrap`}>
        {timeLeft}
      </span>
    </div>
  );
}

export interface InviteTableHandle {
  clearFilters: () => void;
}

interface InviteTableProps {
  invites: Invite[];
  isLoading: boolean;
  onRefresh: () => void;
  onResetFilters?: () => void;
}

type SortKey = keyof Invite | 'uses';

const InviteTable = forwardRef<InviteTableHandle, InviteTableProps>(({ invites, isLoading, onRefresh, onResetFilters }, ref) => {
  const { themeClasses, accentClasses } = useTheme();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [inviteToDelete, setInviteToDelete] = useState<Invite | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [now, setNow] = useState(Date.now());

  const statusStyles = {
    ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
    USED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    EXPIRED: 'bg-red-500/10 text-red-500 border-red-500/20',
    REVOKED: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  // Update 'now' every second to trigger live expiry updates
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useImperativeHandle(ref, () => ({
    clearFilters: () => {
      setFilters({});
      setSortConfig(null);
    }
  }));

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied to clipboard');
  };

  const handleDelete = async () => {
    if (!inviteToDelete) return;

    setIsDeleting(true);
    setDeletingId(inviteToDelete.id);
    try {
      await adminApi.deleteInvite(inviteToDelete.id);
      toast.success('Invite deleted');
      onRefresh();
      setInviteToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data || 'Failed to delete invite');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleFilter = (column: string, value: string) => {
    setFilters(prev => {
      const current = prev[column] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];

      const newFilters = { ...prev };
      if (updated.length === 0) {
        delete newFilters[column];
      } else {
        newFilters[column] = updated;
      }
      return newFilters;
    });
  };

  const processedInvites = useMemo(() => {
    let result = invites.map(invite => {
      const isExpired = invite.expires_at && new Date(invite.expires_at).getTime() < now;
      if (isExpired && invite.status === 'ACTIVE') {
        return { ...invite, status: 'EXPIRED' as const };
      }
      return invite;
    });

    // Apply column filters
    Object.entries(filters).forEach(([column, values]) => {
      result = result.filter(invite => {
        const val = String(invite[column as keyof Invite] || '');
        return values.includes(val);
      });
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = sortConfig.key === 'uses' ? a.use_count : a[sortConfig.key as keyof Invite];
        let bValue: any = sortConfig.key === 'uses' ? b.use_count : b[sortConfig.key as keyof Invite];

        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [invites, sortConfig, filters, now]);

  const getUniqueValues = (column: keyof Invite) => {
    const values = invites.map(i => String(i[column] || ''));
    return Array.from(new Set(values)).filter(Boolean).sort();
  };

  if (isLoading) {
    return (
      <div className={`py-20 flex items-center justify-center ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl`}>
        <Loader2 className={`w-8 h-8 animate-spin ${accentClasses.textClass}`} />
      </div>
    );
  }

  const ColumnHeader = ({ title, sortKey, filterKey }: { title: string, sortKey?: SortKey, filterKey?: keyof Invite }) => (
    <TableHead className={`${themeClasses.textSecondary} font-medium group`}>
      <div className="flex items-center gap-1">
        <div
          className={`flex items-center gap-2 cursor-pointer select-none hover:${themeClasses.text} transition-colors ${sortConfig?.key === sortKey ? themeClasses.text : ''}`}
          onClick={() => sortKey && handleSort(sortKey)}
        >
          {title}
          {sortKey && (
            <span className={`transition-opacity ${sortConfig?.key === sortKey ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {sortConfig?.key === sortKey ? (
                sortConfig.direction === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>

        {filterKey && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={`h-6 w-6 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 hover:${themeClasses.hoverBg}`}>
                <ChevronDown className={`w-3.5 h-3.5 ${filters[filterKey] ? accentClasses.textClass : ''}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className={`w-48 ${themeClasses.sectionBg} border ${themeClasses.border} ${themeClasses.text} backdrop-blur-xl`}>
              <DropdownMenuLabel className={`text-xs ${themeClasses.textTertiary} uppercase tracking-wider`}>Filter {title}</DropdownMenuLabel>
              <DropdownMenuSeparator className={`${themeClasses.divider}`} />
              {getUniqueValues(filterKey).map(val => (
                <DropdownMenuCheckboxItem
                  key={val}
                  checked={filters[filterKey]?.includes(val)}
                  onCheckedChange={() => toggleFilter(filterKey, val)}
                  className={`focus:${themeClasses.hoverBg} focus:${themeClasses.text}`}
                >
                  {val}
                </DropdownMenuCheckboxItem>
              ))}
              {filters[filterKey] && (
                <>
                  <DropdownMenuSeparator className={`${themeClasses.divider}`} />
                  <DropdownMenuItem
                    onClick={() => {
                      const newFilters = { ...filters };
                      delete newFilters[filterKey];
                      setFilters(newFilters);
                    }}
                    className={`text-xs text-center justify-center ${accentClasses.textClass} hover:${accentClasses.textClass}/80 focus:${themeClasses.hoverBg}`}
                  >
                    Clear Filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TableHead>
  );

  return (
    <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl shadow-2xl overflow-hidden`}>
      <div className="w-full overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader>
            <TableRow className={`${themeClasses.divider} hover:bg-transparent bg-white/[0.02]`}>
              <ColumnHeader title="Invite Code" sortKey="token" />
              <ColumnHeader title="Status" sortKey="status" filterKey="status" />
              <ColumnHeader title="Uses" sortKey="uses" />
              <ColumnHeader title="Expires At" sortKey="expires_at" />
              <ColumnHeader title="Note" sortKey="note" />
              <TableHead className={`${themeClasses.textSecondary} font-medium text-right pr-6`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="wait" initial={false}>
              {processedInvites.length === 0 ? (
                <TableRow key="empty">
                  <TableCell colSpan={6} className="text-center py-20">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <Filter className={`w-8 h-8 ${themeClasses.textTertiary}`} />
                      <div className={`${themeClasses.textSecondary}`}>No invites match your filters.</div>
                      <Button
                        variant="link"
                        onClick={() => {
                          setFilters({});
                          setSortConfig(null);
                          onResetFilters?.();
                        }}
                        className={`${accentClasses.textClass} hover:${accentClasses.textClass}/80`}
                      >
                        Reset all table filters
                      </Button>
                    </motion.div>
                  </TableCell>
                </TableRow>
              ) : (
                processedInvites.map((invite, index) => (
                  <motion.tr
                    key={invite.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className={`${themeClasses.divider} hover:${themeClasses.hoverBg} transition-colors group/row`}
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 group/code w-fit">
                        <div className="relative flex items-center">
                          <code className={`pl-3 pr-10 py-1.5 ${themeClasses.inputBg} rounded-lg ${accentClasses.textClass} font-mono text-sm min-w-[140px]`}>
                            {invite.token}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCode(invite.token)}
                            className={`absolute right-1 h-7 w-7 ${themeClasses.textTertiary} hover:${themeClasses.text} hover:${themeClasses.hoverBg}`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusStyles[invite.status]} border font-medium px-2.5 py-0.5`}>
                        {invite.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`${themeClasses.textSecondary}`}>
                      <div className="flex flex-col">
                        <span className={`font-medium ${themeClasses.textSecondary}`}>{invite.use_count} / {invite.max_uses === 0 ? '∞' : invite.max_uses}</span>
                        {invite.used_by && (
                          <span className={`text-[10px] ${themeClasses.textTertiary} mt-0.5 truncate max-w-[120px]`}>
                            {invite.used_by}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`${themeClasses.textSecondary}`}>
                      <CountdownTimer expiresAt={invite.expires_at} status={invite.status} />
                    </TableCell>
                    <TableCell className={`${themeClasses.textSecondary} text-sm max-w-[200px] truncate`}>
                      {invite.note || <span className={`${themeClasses.textTertiary}`}>-</span>}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={invite.use_count > 0 || deletingId === invite.id}
                          onClick={() => setInviteToDelete(invite)}
                          className={`h-8 w-8 ${themeClasses.textSecondary} hover:text-red-400 hover:${themeClasses.hoverBg} disabled:opacity-30 disabled:hover:bg-transparent`}
                        >
                          {deletingId === invite.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <DeleteInviteModal
        open={!!inviteToDelete}
        onOpenChange={(open) => !open && setInviteToDelete(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        token={inviteToDelete?.token}
      />
    </div>
  );
});

export default InviteTable;
