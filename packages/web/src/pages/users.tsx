import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download } from 'lucide-react';
import UserTable from '@/components/users/UserTable';
import CreateUserModal from '@/components/users/CreateUserModal';
import ExportUsersModal from '@/components/users/ExportUsersModal';
import { adminApi, type AdminUser } from '@/api/admin';
import { useTheme } from '../context/ThemeContext';

export default function Users() {
  const { themeClasses, accentClasses } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await adminApi.getUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.friendly_name && user.friendly_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);

  const stats = useMemo(() => {
    return [
      { label: 'Total Users', value: users.length.toString() },
      { label: 'Active Users', value: users.filter(u => u.status === 'ACTIVE').length.toString() },
      { label: 'Admins', value: users.filter(u => u.role === 'Admin').length.toString() },
      { label: 'Vault Items', value: users.reduce((acc, u) => acc + u.vault_items, 0).toLocaleString() },
    ];
  }, [users]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className={`text-3xl font-bold ${themeClasses.text} transition-all duration-300`}>User Management</h1>
          <p className={`${themeClasses.textSecondary} mt-1 transition-all duration-300`}>Manage and monitor user accounts</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className={`h-11 px-5 ${accentClasses.bgClass} hover:${accentClasses.bgHoverClass} ${accentClasses.onContrastClass} font-semibold rounded-xl shadow-lg ${accentClasses.shadowClass}`}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add User
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-4 transition-all duration-300`}
          >
            <p className={`${themeClasses.textSecondary} text-sm transition-all duration-300`}>{stat.label}</p>
            <p className={`text-2xl font-bold ${themeClasses.text} mt-1 transition-all duration-300`}>{stat.value}</p>
          </div>
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
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-11 h-11 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} placeholder:${themeClasses.textTertiary} focus:${accentClasses.focusBorderClass}/50 rounded-xl transition-all duration-300`}
          />
        </div>
        <Button
          variant="outline"
          className={`h-11 px-4 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} hover:${themeClasses.text} rounded-xl`}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowExportModal(true)}
          className={`h-11 px-4 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} hover:${themeClasses.text} rounded-xl`}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </motion.div>

      {/* User Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <UserTable users={filteredUsers} loading={loading} />
      </motion.div>

      {/* Pagination (Simplified for now) */}
      {!loading && filteredUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between"
        >
          <p className={`${themeClasses.textSecondary} text-sm`}>Showing {filteredUsers.length} users</p>
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

      {/* Create User Modal */}
      <CreateUserModal open={showCreateModal} onOpenChange={setShowCreateModal} />

      {/* Export Users Modal */}
      <ExportUsersModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        users={users}
      />
    </div>
  );
}
