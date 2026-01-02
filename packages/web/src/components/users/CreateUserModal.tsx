import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Mail, Shield, Loader2 } from 'lucide-react';

export default function CreateUserModal({ open, onOpenChange }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#141414] border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <User className="w-5 h-5 text-yellow-500" />
            </div>
            Create New User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <Input
                placeholder="Enter full name"
                className="pl-10 h-11 bg-[#0a0a0a] border-gray-800 text-white placeholder:text-gray-600 focus:border-yellow-500/50 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <Input
                type="email"
                placeholder="Enter email address"
                className="pl-10 h-11 bg-[#0a0a0a] border-gray-800 text-white placeholder:text-gray-600 focus:border-yellow-500/50 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Role</Label>
            <Select defaultValue="user">
              <SelectTrigger className="h-11 bg-[#0a0a0a] border-gray-800 text-white focus:ring-yellow-500/20 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-gray-800">
                <SelectItem value="user" className="text-white hover:bg-white/10">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" /> User
                  </div>
                </SelectItem>
                <SelectItem value="admin" className="text-white hover:bg-white/10">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 bg-transparent border-gray-800 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-11 bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-semibold rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Create User'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}