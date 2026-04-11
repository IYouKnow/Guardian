import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
  Check,
  Trash2,
  Loader2,
  Clock,
  Users,
  Ticket,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, type Invite } from '@/api/admin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeleteInviteModal from './DeleteInviteModal';
import { useTheme } from '../../context/ThemeContext';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-500/15 text-green-400 border-green-500/30',
    USED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    EXPIRED: 'bg-red-500/15 text-red-400 border-red-500/30',
    REVOKED: 'bg-red-500/15 text-red-400 border-red-500/30',
  };

  return (
    <Badge variant="outline" className={`${styles[status] || ''} font-medium text-[10px] px-2 py-0 border`}>
      {status}
    </Badge>
  );
}

function ExpiryDisplay({ expiresAt, status }: { expiresAt: string | null, status: string }) {
  const { themeClasses, accentClasses } = useTheme();
  
  const calculateTimeLeft = (): string | null => {
    if (!expiresAt || status !== 'ACTIVE') return null;
    
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const distance = expiry - now;

    if (isNaN(distance) || distance <= 0) return null;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  const [timeLeft, setTimeLeft] = useState<string | null>(() => calculateTimeLeft());

  useEffect(() => {
    if (!expiresAt || status !== 'ACTIVE') {
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, status]);

  if (!expiresAt) return <span className={`${themeClasses.textTertiary} text-xs`}>Never</span>;
  
  if (status === 'EXPIRED') {
    return (
      <span className="text-red-400 text-xs">
        {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }

  if (!timeLeft) {
    return (
      <span className={`${themeClasses.textSecondary} text-xs`}>
        {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Clock className={`w-3 h-3 ${accentClasses.textClass}`} />
      <span className={`${accentClasses.textClass} text-xs font-medium`}>
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

const InviteTable = forwardRef<InviteTableHandle, InviteTableProps>(({ invites, isLoading, onRefresh, onResetFilters }, ref) => {
  const { themeClasses, accentClasses } = useTheme();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [inviteToDelete, setInviteToDelete] = useState<Invite | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useImperativeHandle(ref, () => ({
    clearFilters: () => {
      onResetFilters?.();
    }
  }));

  const copyCode = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={`py-20 flex items-center justify-center ${themeClasses.cardBg} border ${themeClasses.border} rounded-xl`}>
        <Loader2 className={`w-6 h-6 animate-spin ${accentClasses.textClass}`} />
      </div>
    );
  }

  return (
    <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl overflow-hidden`}>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className={`${themeClasses.divider} hover:bg-transparent bg-white/[0.02]`}>
              <TableHead className={`${themeClasses.textTertiary} font-medium text-xs`}>Token</TableHead>
              <TableHead className={`${themeClasses.textTertiary} font-medium text-xs`}>Status</TableHead>
              <TableHead className={`${themeClasses.textTertiary} font-medium text-xs`}>Uses</TableHead>
              <TableHead className={`${themeClasses.textTertiary} font-medium text-xs`}>Created</TableHead>
              <TableHead className={`${themeClasses.textTertiary} font-medium text-xs`}>Expires</TableHead>
              <TableHead className={`${themeClasses.textTertiary} font-medium text-xs`}>Note</TableHead>
              <TableHead className={`${themeClasses.textTertiary} font-medium text-xs text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Ticket className={`w-6 h-6 ${themeClasses.textTertiary}`} />
                    <div className={`${themeClasses.textSecondary} text-sm`}>No invites found</div>
                    <Button
                      variant="link"
                      onClick={onResetFilters}
                      className={`${accentClasses.textClass} text-xs`}
                    >
                      Clear search
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => (
                <TableRow
                  key={invite.id}
                  className={`${themeClasses.divider} hover:${themeClasses.hoverBg} transition-colors`}
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <code className={`px-2 py-1 ${themeClasses.inputBg} rounded ${accentClasses.textClass} font-mono text-xs`}>
                        {invite.token}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCode(invite.token, invite.id)}
                        className={`h-6 w-6 ${themeClasses.textTertiary} hover:${themeClasses.text}`}
                      >
                        {copiedId === invite.id ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <StatusBadge status={invite.status} />
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <Users className={`w-3.5 h-3.5 ${themeClasses.textTertiary}`} />
                      <span className={`${themeClasses.text} text-sm`}>
                        {invite.use_count}
                        {invite.max_uses > 0 && <span className={`${themeClasses.textTertiary}`}>/{invite.max_uses}</span>}
                        {invite.max_uses === 0 && <span className={`${themeClasses.textTertiary}`}> / ∞</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className={`${themeClasses.textSecondary} text-xs`}>
                      {new Date(invite.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <ExpiryDisplay expiresAt={invite.expires_at} status={invite.status} />
                  </TableCell>
                  <TableCell className="py-3">
                    {invite.note ? (
                      <span className={`${themeClasses.textSecondary} text-xs max-w-[200px] truncate block`}>
                        {invite.note}
                      </span>
                    ) : (
                      <span className={`${themeClasses.textTertiary} text-xs`}>—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${themeClasses.textSecondary} hover:${themeClasses.text}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={`${themeClasses.sectionBg} border ${themeClasses.border} ${themeClasses.text}`}>
                        <DropdownMenuItem
                          onClick={() => copyCode(invite.token, invite.id)}
                          className={`text-xs ${themeClasses.textSecondary} hover:${themeClasses.text}`}
                        >
                          <Copy className="w-3 h-3 mr-2" />
                          Copy token
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={invite.use_count > 0 || deletingId === invite.id}
                          onClick={() => setInviteToDelete(invite)}
                          className={`text-xs text-red-400 hover:text-red-300 ${deletingId === invite.id ? 'opacity-50' : ''}`}
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
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

InviteTable.displayName = 'InviteTable';

export default InviteTable;