import React from 'react';
import { motion } from 'framer-motion';
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
import { Copy, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, type Invite } from '@/api/admin';

const statusStyles = {
  ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
  USED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  EXPIRED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  REVOKED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function InviteTable() {
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const fetchInvites = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getInvites();
      setInvites(data);
    } catch (error) {
      toast.error('Failed to fetch invites');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInvites();
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied to clipboard');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invite?')) return;

    setDeletingId(id);
    try {
      await adminApi.deleteInvite(id);
      toast.success('Invite deleted');
      fetchInvites();
    } catch (error: any) {
      toast.error(error.response?.data || 'Failed to delete invite');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-[#141414] border border-gray-800/50 rounded-2xl">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-gray-800/50 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800/50 hover:bg-transparent">
              <TableHead className="text-gray-400 font-medium">Invite Code</TableHead>
              <TableHead className="text-gray-400 font-medium">Status</TableHead>
              <TableHead className="text-gray-400 font-medium">Uses</TableHead>
              <TableHead className="text-gray-400 font-medium">Expires At</TableHead>
              <TableHead className="text-gray-400 font-medium">Note</TableHead>
              <TableHead className="text-gray-400 font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  No invites found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite, index) => (
                <motion.tr
                  key={invite.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="border-gray-800/50 hover:bg-white/[0.02] transition-colors"
                >
                  <TableCell>
                    <code className="px-3 py-1.5 bg-[#0a0a0a] rounded-lg text-yellow-400 font-mono text-sm">
                      {invite.token}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusStyles[invite.status]} border font-medium`}>
                      {invite.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {invite.use_count} / {invite.max_uses === 0 ? '∞' : invite.max_uses}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm max-w-[200px] truncate">
                    {invite.note || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCode(invite.token)}
                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={invite.use_count > 0 || deletingId === invite.id}
                        onClick={() => handleDelete(invite.id)}
                        className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent"
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
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
