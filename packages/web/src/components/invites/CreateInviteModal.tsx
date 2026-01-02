import React, { useState } from 'react';
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
import { Ticket, User, Shield, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateInviteModal({ open, onOpenChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setGeneratedCode('INV-' + Math.random().toString(36).substring(2, 10).toUpperCase());
    }, 1000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedCode(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#141414] border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Ticket className="w-5 h-5 text-yellow-500" />
            </div>
            {generatedCode ? 'Invite Created' : 'Create Invite'}
          </DialogTitle>
        </DialogHeader>

        {generatedCode ? (
          <div className="space-y-6 mt-4">
            <div className="p-4 bg-[#0a0a0a] rounded-xl border border-gray-800">
              <p className="text-gray-400 text-sm mb-2">Your invite code</p>
              <div className="flex items-center justify-between">
                <code className="text-2xl font-mono text-yellow-400">{generatedCode}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyCode}
                  className="h-10 w-10 text-gray-400 hover:text-white hover:bg-white/10"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>
            <p className="text-gray-500 text-sm text-center">
              Share this code with the person you want to invite. They can use it to create their account.
            </p>
            <Button
              onClick={handleClose}
              className="w-full h-11 bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-semibold rounded-xl"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Account Type</Label>
              <Select defaultValue="user">
                <SelectTrigger className="h-11 bg-[#0a0a0a] border-gray-800 text-white focus:ring-yellow-500/20 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-800">
                  <SelectItem value="user" className="text-white hover:bg-white/10">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" /> User Account
                    </div>
                  </SelectItem>
                  <SelectItem value="admin" className="text-white hover:bg-white/10">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Admin Account
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Max Uses</Label>
              <Select defaultValue="1">
                <SelectTrigger className="h-11 bg-[#0a0a0a] border-gray-800 text-white focus:ring-yellow-500/20 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-800">
                  <SelectItem value="1" className="text-white hover:bg-white/10">1 use</SelectItem>
                  <SelectItem value="5" className="text-white hover:bg-white/10">5 uses</SelectItem>
                  <SelectItem value="10" className="text-white hover:bg-white/10">10 uses</SelectItem>
                  <SelectItem value="unlimited" className="text-white hover:bg-white/10">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Expires In</Label>
              <Select defaultValue="7">
                <SelectTrigger className="h-11 bg-[#0a0a0a] border-gray-800 text-white focus:ring-yellow-500/20 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-800">
                  <SelectItem value="1" className="text-white hover:bg-white/10">1 day</SelectItem>
                  <SelectItem value="7" className="text-white hover:bg-white/10">7 days</SelectItem>
                  <SelectItem value="14" className="text-white hover:bg-white/10">14 days</SelectItem>
                  <SelectItem value="30" className="text-white hover:bg-white/10">30 days</SelectItem>
                  <SelectItem value="never" className="text-white hover:bg-white/10">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
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
                  'Generate Code'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}