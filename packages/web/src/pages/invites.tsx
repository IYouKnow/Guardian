import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download } from 'lucide-react';
import InviteTable, { type InviteTableHandle } from '@/components/invites/InviteTable';
import CreateInviteModal from '@/components/invites/CreateInviteModal';
import ExportInvitesModal from '@/components/invites/ExportInvitesModal';
import { adminApi, type Invite } from '@/api/admin';
import { toast } from 'sonner';
import { useTheme } from '../context/ThemeContext';

export default function Invites() {
  const { themeClasses, accentClasses } = useTheme();
  const tableRef = useRef<InviteTableHandle>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
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

  const handleExport = () => {
    setShowExportModal(true);
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
          <h1 className={`text-3xl font-bold ${themeClasses.text} transition-all duration-300`}>Invites & Tokens</h1>
          <p className={`${themeClasses.textSecondary} mt-1 transition-all duration-300`}>Create and manage invite codes</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className={`h-11 px-5 ${accentClasses.bgClass} hover:${accentClasses.bgHoverClass} ${accentClasses.onContrastClass} font-semibold rounded-xl shadow-lg ${accentClasses.shadowClass} focus-visible:ring-0 focus-visible:ring-offset-0`}
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
          { label: 'Total Invites', value: stats.total, filter: 'ALL' },
          { label: 'Active', value: stats.active, filter: 'ACTIVE' },
          { label: 'Used', value: stats.used, filter: 'USED' },
          { label: 'Expired', value: stats.expired, filter: 'EXPIRED' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            onClick={() => setStatusFilter(stat.filter as any)}
            className={`cursor-pointer p-4 rounded-xl border transition-all duration-300 ${statusFilter === stat.filter
              ? `${themeClasses.activeBg} border-${accentClasses.base}`
              : `${themeClasses.cardBg} border-transparent ${themeClasses.hoverBg}`
              }`}
          >
            <p className={`${themeClasses.textSecondary} text-sm font-medium transition-all duration-300`}>{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 transition-all duration-300 ${statusFilter === stat.filter ? accentClasses.textClass : themeClasses.text}`}>
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
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${themeClasses.textTertiary} transition-all duration-300`} />
          <Input
            placeholder="Search invite codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-11 h-11 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} placeholder:${themeClasses.textTertiary} focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none rounded-xl transition-all duration-300`}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className={`h-11 px-4 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} hover:${themeClasses.text} rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className={`h-11 px-4 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} hover:${themeClasses.text} rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0`}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
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

      {/* Pagination */}
      {!isLoading && filteredInvites.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between"
        >
          <p className={`${themeClasses.textSecondary} text-sm`}>Showing {filteredInvites.length} invites</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`bg-transparent ${themeClasses.border} ${themeClasses.textTertiary} rounded-lg`}
              disabled
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`${accentClasses.lightClass} ${accentClasses.borderClass} ${accentClasses.textClass} rounded-lg`}
            >
              1
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`bg-transparent ${themeClasses.border} ${themeClasses.textTertiary} rounded-lg`}
              disabled
            >
              Next
            </Button>
          </div>
        </motion.div>
      )}

      {/* Create Invite Modal */}
      <CreateInviteModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
      />

      {/* Export Invites Modal */}
      <ExportInvitesModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        invites={invites}
      />
    </div>
  );
}
