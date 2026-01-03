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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Key, Shield, UserX, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AdminUser } from '@/api/admin';

interface UserTableProps {
  users: AdminUser[];
  loading: boolean;
}

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
  INACTIVE: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  SUSPENDED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const roleStyles: Record<string, string> = {
  Admin: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  User: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function UserTable({ users, loading }: UserTableProps) {
  if (loading) {
    return (
      <div className="bg-[#141414] border border-gray-800/50 rounded-2xl p-12 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
        <p className="text-gray-500">Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-[#141414] border border-gray-800/50 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-2">
          <Shield className="w-8 h-8 text-gray-700" />
        </div>
        <h3 className="text-white font-semibold text-lg">No users found</h3>
        <p className="text-gray-500 max-w-sm">
          No users match your current search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-gray-800/50 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800/50 hover:bg-transparent">
              <TableHead className="text-gray-400 font-medium">User</TableHead>
              <TableHead className="text-gray-400 font-medium">Role</TableHead>
              <TableHead className="text-gray-400 font-medium">Status</TableHead>
              <TableHead className="text-gray-400 font-medium">Vault Items</TableHead>
              <TableHead className="text-gray-400 font-medium">Last Active</TableHead>
              <TableHead className="text-gray-400 font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="border-gray-800/50 hover:bg-white/[0.02] transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-gray-800">
                      <AvatarFallback className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 text-yellow-500 font-medium uppercase">
                        {user.username.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">{user.friendly_name || user.username}</p>
                      <p className="text-gray-500 text-sm">{user.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${roleStyles[user.role] || roleStyles.User} border font-medium`}>
                    {user.role === 'Admin' && <Shield className="w-3 h-3 mr-1" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${statusStyles[user.status] || statusStyles.ACTIVE} border font-medium`}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-white">
                    <Key className="w-4 h-4 text-gray-500" />
                    {user.vault_items}
                  </div>
                </TableCell>
                <TableCell className="text-gray-400">
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-gray-800 text-white">
                      <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" /> Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                        <Key className="w-4 h-4 mr-2" /> Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-white/10 cursor-pointer text-yellow-400">
                        <UserX className="w-4 h-4 mr-2" /> Suspend User
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-white/10 cursor-pointer text-red-400">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
