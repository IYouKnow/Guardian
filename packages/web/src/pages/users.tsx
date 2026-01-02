import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Plus, Search, Filter, Download } from 'lucide-react';
import UserTable from '@/components/users/UserTable';
import CreateUserModal from '@/components/users/CreateUserModal';

export default function Users() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-500 mt-1">Manage and monitor user accounts</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="h-11 px-5 bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-semibold rounded-xl shadow-lg shadow-yellow-500/20"
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
        {[
          { label: 'Total Users', value: '2,847', color: 'yellow' },
          { label: 'Active Users', value: '2,541', color: 'green' },
          { label: 'Inactive', value: '218', color: 'gray' },
          { label: 'Suspended', value: '88', color: 'red' },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="bg-[#141414] border border-gray-800/50 rounded-xl p-4"
          >
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-[#141414] border-gray-800 text-white placeholder:text-gray-600 focus:border-yellow-500/50 rounded-xl"
          />
        </div>
        <Button
          variant="outline"
          className="h-11 px-4 bg-transparent border-gray-800 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <Button
          variant="outline"
          className="h-11 px-4 bg-transparent border-gray-800 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl"
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
        <UserTable />
      </motion.div>

      {/* Pagination */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-between"
      >
        <p className="text-gray-500 text-sm">Showing 1-7 of 2,847 users</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-gray-800 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg"
            disabled
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 rounded-lg"
          >
            1
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-gray-800 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg"
          >
            2
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-gray-800 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg"
          >
            3
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-gray-800 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg"
          >
            Next
          </Button>
        </div>
      </motion.div>

      {/* Create User Modal */}
      <CreateUserModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}