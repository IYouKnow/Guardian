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
import { MoreHorizontal, Edit, Trash2, Key, Shield, UserX } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const users = [
  { id: 1, name: 'John Doe', email: 'john.doe@email.com', role: 'Admin', status: 'Active', items: 156, lastActive: '2 min ago' },
  { id: 2, name: 'Sarah Smith', email: 'sarah.smith@email.com', role: 'User', status: 'Active', items: 89, lastActive: '15 min ago' },
  { id: 3, name: 'Mike Wilson', email: 'mike.wilson@email.com', role: 'User', status: 'Inactive', items: 234, lastActive: '3 days ago' },
  { id: 4, name: 'Emily Chen', email: 'emily.chen@email.com', role: 'Admin', status: 'Active', items: 45, lastActive: '1 hour ago' },
  { id: 5, name: 'David Brown', email: 'david.brown@email.com', role: 'User', status: 'Suspended', items: 12, lastActive: '1 week ago' },
  { id: 6, name: 'Lisa Johnson', email: 'lisa.j@email.com', role: 'User', status: 'Active', items: 78, lastActive: '5 min ago' },
  { id: 7, name: 'Alex Turner', email: 'alex.t@email.com', role: 'User', status: 'Active', items: 167, lastActive: '30 min ago' },
];

const statusStyles: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-400 border-green-500/20',
  Inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  Suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const roleStyles: Record<string, string> = {
  Admin: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  User: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function UserTable() {
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
                      <AvatarFallback className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 text-yellow-500 font-medium">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-gray-500 text-sm">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${roleStyles[user.role]} border font-medium`}>
                    {user.role === 'Admin' && <Shield className="w-3 h-3 mr-1" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${statusStyles[user.status]} border font-medium`}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-white">
                    <Key className="w-4 h-4 text-gray-500" />
                    {user.items}
                  </div>
                </TableCell>
                <TableCell className="text-gray-400">{user.lastActive}</TableCell>
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