import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, RefreshCw } from 'lucide-react';
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
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvites = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getInvites();
      setInvites(data);
    } catch {
      toast.error('Failed to fetch invites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const filteredInvites = useMemo(() => {
    return invites.filter(invite => {
      const matchesSearch = invite.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (invite.note && invite.note.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [invites, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Minimal Header */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setShowCreateModal(true)}
          className={`h-8 px-3 ${accentClasses.bgClass} hover:${accentClasses.bgHoverClass} ${accentClasses.onContrastClass} font-medium rounded-md text-xs`}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Invite
        </Button>
        
        <div className="flex-1 max-w-[280px]">
          <div className="relative">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeClasses.textTertiary}`} />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-8 h-8 text-xs ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} placeholder:${themeClasses.textTertiary} focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none rounded-md`}
            />
          </div>
        </div>

        <Button
          variant="outline"
          onClick={fetchInvites}
          className={`h-8 px-2.5 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} hover:${themeClasses.text} rounded-md text-xs`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setShowExportModal(true)}
          className={`h-8 px-2.5 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} hover:${themeClasses.text} rounded-md text-xs`}
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Table */}
      <InviteTable
        ref={tableRef}
        invites={filteredInvites}
        isLoading={isLoading}
        onRefresh={fetchInvites}
        onResetFilters={() => setSearchQuery('')}
      />

      {/* Modals */}
      <CreateInviteModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchInvites}
      />

      <ExportInvitesModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        invites={invites}
      />
    </div>
  );
}