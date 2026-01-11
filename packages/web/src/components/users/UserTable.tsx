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
import { useTheme } from '../../context/ThemeContext';

interface UserTableProps {
  users: AdminUser[];
  loading: boolean;
}

export default function UserTable({ users, loading }: UserTableProps) {
  const { themeClasses, accentClasses } = useTheme();

  const statusStyles: Record<string, string> = {
    ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
    INACTIVE: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    SUSPENDED: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const roleStyles: Record<string, string> = {
    Admin: `${accentClasses.textClass} ${accentClasses.lightClass} ${accentClasses.borderClass}`,
    User: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  if (loading) {
    return (
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-12 flex flex-col items-center justify-center gap-4`}>
        <Loader2 className={`w-8 h-8 ${accentClasses.textClass} animate-spin`} />
        <p className={`${themeClasses.textSecondary}`}>Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center`}>
        <div className={`w-16 h-16 ${themeClasses.sectionBg} rounded-full flex items-center justify-center mb-2`}>
          <Shield className={`w-8 h-8 ${themeClasses.textTertiary}`} />
        </div>
        <h3 className={`${themeClasses.text} font-semibold text-lg`}>No users found</h3>
        <p className={`${themeClasses.textSecondary} max-w-sm`}>
          No users match your current search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl overflow-hidden`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className={`${themeClasses.divider} hover:bg-transparent`}>
              <TableHead className={`${themeClasses.textSecondary} font-medium`}>User</TableHead>
              <TableHead className={`${themeClasses.textSecondary} font-medium`}>Role</TableHead>
              <TableHead className={`${themeClasses.textSecondary} font-medium`}>Status</TableHead>
              <TableHead className={`${themeClasses.textSecondary} font-medium`}>Vault Items</TableHead>
              <TableHead className={`${themeClasses.textSecondary} font-medium`}>Last Active</TableHead>
              <TableHead className={`${themeClasses.textSecondary} font-medium text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={`${themeClasses.divider} hover:${themeClasses.hoverBg} transition-colors`}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-10 w-10 border ${themeClasses.border}`}>
                      <AvatarFallback className={`bg-gradient-to-br ${accentClasses.bgClass}/20 to-${accentClasses.bgClass.split('-')[1]}-600/10 ${accentClasses.textClass} font-medium uppercase`}>
                        {user.username.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={`${themeClasses.text} font-medium`}>{user.friendly_name || user.username}</p>
                      <p className={`${themeClasses.textSecondary} text-sm`}>{user.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${roleStyles[user.role] || roleStyles.User} font-medium`}>
                    {user.role === 'Admin' && <Shield className="w-3 h-3 mr-1" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${statusStyles[user.status] || statusStyles.ACTIVE} font-medium`}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-2 ${themeClasses.text}`}>
                    <Key className={`w-4 h-4 ${themeClasses.textTertiary}`} />
                    {user.vault_items}
                  </div>
                </TableCell>
                <TableCell className={`${themeClasses.textSecondary}`}>
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className={`h-8 w-8 ${themeClasses.textSecondary} hover:${themeClasses.text} hover:${themeClasses.hoverBg}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={`${themeClasses.sectionBg} border ${themeClasses.border} ${themeClasses.text} backdrop-blur-xl`}>
                      <DropdownMenuItem className={`hover:${themeClasses.hoverBg} cursor-pointer`}>
                        <Edit className="w-4 h-4 mr-2" /> Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem className={`hover:${themeClasses.hoverBg} cursor-pointer`}>
                        <Key className="w-4 h-4 mr-2" /> Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem className={`hover:${themeClasses.hoverBg} cursor-pointer text-yellow-400`}>
                        <UserX className="w-4 h-4 mr-2" /> Suspend User
                      </DropdownMenuItem>
                      <DropdownMenuItem className={`hover:${themeClasses.hoverBg} cursor-pointer text-red-400`}>
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
