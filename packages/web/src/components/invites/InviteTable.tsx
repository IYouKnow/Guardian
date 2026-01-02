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
import { Copy, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const invites = [
  { id: 1, code: 'INV-7X9K2M4N', type: 'User', status: 'Active', uses: '0/1', expiresIn: '6 days', createdBy: 'admin@vault.com' },
  { id: 2, code: 'INV-3P8L5Q2R', type: 'Admin', status: 'Active', uses: '0/1', expiresIn: '13 days', createdBy: 'admin@vault.com' },
  { id: 3, code: 'INV-9T4Y7H1J', type: 'User', status: 'Used', uses: '1/1', expiresIn: '-', createdBy: 'john.doe@email.com' },
  { id: 4, code: 'INV-2W6E8D5F', type: 'User', status: 'Expired', uses: '0/1', expiresIn: '-', createdBy: 'admin@vault.com' },
  { id: 5, code: 'INV-5C1V3B9N', type: 'User', status: 'Active', uses: '2/5', expiresIn: '29 days', createdBy: 'emily.chen@email.com' },
];

const statusStyles = {
  Active: 'bg-green-500/10 text-green-400 border-green-500/20',
  Used: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Expired: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const typeStyles = {
  Admin: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  User: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function InviteTable() {
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied to clipboard');
  };

  return (
    <div className="bg-[#141414] border border-gray-800/50 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800/50 hover:bg-transparent">
              <TableHead className="text-gray-400 font-medium">Invite Code</TableHead>
              <TableHead className="text-gray-400 font-medium">Type</TableHead>
              <TableHead className="text-gray-400 font-medium">Status</TableHead>
              <TableHead className="text-gray-400 font-medium">Uses</TableHead>
              <TableHead className="text-gray-400 font-medium">Expires In</TableHead>
              <TableHead className="text-gray-400 font-medium">Created By</TableHead>
              <TableHead className="text-gray-400 font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite, index) => (
              <motion.tr
                key={invite.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="border-gray-800/50 hover:bg-white/[0.02] transition-colors"
              >
                <TableCell>
                  <code className="px-3 py-1.5 bg-[#0a0a0a] rounded-lg text-yellow-400 font-mono text-sm">
                    {invite.code}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${typeStyles[invite.type]} border font-medium`}>
                    {invite.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${statusStyles[invite.status]} border font-medium`}>
                    {invite.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-400">{invite.uses}</TableCell>
                <TableCell className="text-gray-400">{invite.expiresIn}</TableCell>
                <TableCell className="text-gray-400 text-sm">{invite.createdBy}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyCode(invite.code)}
                      className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {invite.status === 'Active' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}