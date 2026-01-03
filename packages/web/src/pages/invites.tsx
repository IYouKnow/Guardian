import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from 'lucide-react';
import InviteTable, { type InviteTableHandle } from '@/components/invites/InviteTable';
import CreateInviteModal from '@/components/invites/CreateInviteModal';
import { adminApi, type Invite } from '@/api/admin';
import { toast } from 'sonner';

export default function Invites() {
  const tableRef = useRef<InviteTableHandle>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'USED' | 'EXPIRED'>('ALL');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleCreateSuccess = () => {
    fetchInvites();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    tableRef.current?.clearFilters();
  };

  const stats = useMemo(() => {
    return {
      total: invites.length,
      active: invites.filter(i => i.status === 'ACTIVE').length,
      used: invites.filter(i => i.status === 'USED').length,
      expired: invites.filter(i => i.status === 'EXPIRED').length,
    };
  }, [invites]);

  const filteredInvites = useMemo(() => {
    return invites.filter(invite => {
      const matchesSearch = invite.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (invite.note && invite.note.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || invite.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invites, searchQuery, statusFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Invites & Tokens</h1>
          <p className="text-gray-500 mt-1">Create and manage invite codes</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="h-11 px-5 bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-semibold rounded-xl shadow-lg shadow-yellow-500/20"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Invite
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Invites', value: stats.total, color: 'yellow', filter: 'ALL' },
          { label: 'Active', value: stats.active, color: 'green', filter: 'ACTIVE' },
          { label: 'Used', value: stats.used, color: 'blue', filter: 'USED' },
          { label: 'Expired', value: stats.expired, color: 'gray', filter: 'EXPIRED' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            onClick={() => setStatusFilter(stat.filter as any)}
            className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${statusFilter === stat.filter
              ? 'bg-[#1a1a1a] border-yellow-500/50'
              : 'bg-[#141414] border-gray-800/50 hover:border-gray-700'
              }`}
          >
            <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${statusFilter === stat.filter ? 'text-yellow-400' : 'text-white'}`}>
              {isLoading ? '...' : stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search invite codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-[#141414] border-gray-800 text-white placeholder:text-gray-600 focus:border-yellow-500/50 rounded-xl"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleClearFilters}
          className="h-11 px-4 bg-transparent border-gray-800 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl"
        >
          <Filter className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      </motion.div>

      {/* Invite Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <InviteTable
          ref={tableRef}
          invites={filteredInvites}
          isLoading={isLoading}
          onRefresh={fetchInvites}
          onResetFilters={handleClearFilters}
        />
      </motion.div>

      {/* Create Invite Modal */}
      <CreateInviteModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
