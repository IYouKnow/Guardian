import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Ticket, Loader2, Copy, Check, MessageSquare, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, type Invite } from '@/api/admin';
import { useTheme } from '../../context/ThemeContext';

interface CreateInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreateInviteModal({ open, onOpenChange, onSuccess }: CreateInviteModalProps) {
  const { themeClasses, accentClasses } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [maxUses, setMaxUses] = useState("1");
  const [expiresIn, setExpiresIn] = useState("12h");
  const [note, setNote] = useState("");

  const calculateExpiry = (duration: string) => {
    if (!duration || duration.toLowerCase() === 'never') return null;

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];
    const date = new Date();

    switch (unit) {
      case 's': date.setSeconds(date.getSeconds() + value); break;
      case 'm': date.setMinutes(date.getMinutes() + value); break;
      case 'h': date.setHours(date.getHours() + value); break;
      case 'd': date.setDate(date.getDate() + value); break;
    }
    return date;
  };

  const expiryDate = calculateExpiry(expiresIn);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const uses = parseInt(maxUses);
      const invite = await adminApi.generateInvite({
        max_uses: isNaN(uses) ? 1 : uses,
        expires_in: expiresIn,
        note: note
      });
      setGeneratedInvite(invite);
      toast.success('Invite created successfully');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create invite');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.token);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setGeneratedInvite(null);
      setCopied(false);
      setNote("");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${themeClasses.sectionBg} border ${themeClasses.border} ${themeClasses.text} backdrop-blur-xl max-w-md focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0`}>
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold flex items-center gap-2 ${themeClasses.text}`}>
            <div className={`p-2 rounded-lg ${accentClasses.bgClass}/10`}>
              <Ticket className={`w-5 h-5 ${accentClasses.textClass}`} />
            </div>
            {generatedInvite ? 'Invite Created' : 'Create Invite'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {generatedInvite ? 'Your new invite token has been generated.' : 'Fill in the details to create a new invite token.'}
          </DialogDescription>
        </DialogHeader>

        {generatedInvite ? (
          <div className="space-y-6 mt-4">
            <div className={`p-4 ${themeClasses.inputBg} rounded-xl`}>
              <p className={`${themeClasses.textSecondary} text-sm mb-2`}>Your invite code</p>
              <div className="flex items-center justify-between">
                <code className={`text-xl font-mono ${accentClasses.textClass}`}>{generatedInvite.token}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyCode}
                  className={`h-10 w-10 ${themeClasses.textSecondary} hover:${themeClasses.text} hover:${themeClasses.hoverBg} focus-visible:ring-0 focus-visible:ring-offset-0`}
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>
            <p className={`${themeClasses.textSecondary} text-sm text-center`}>
              Share this code with the person you want to invite. They can use it to create their account.
            </p>
            <Button
              onClick={() => handleOpenChange(false)}
              className={`w-full h-11 ${accentClasses.bgClass} hover:${accentClasses.bgHoverClass} text-black font-semibold rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0`}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label className={`${themeClasses.textSecondary} text-sm`}>Max Uses</Label>
              <div className="relative">
                <Hash className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textTertiary}`} />
                <Input
                  type="number"
                  min="0"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="e.g., 1"
                  className={`pl-10 h-11 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} placeholder:${themeClasses.textTertiary} focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none rounded-xl`}
                />
              </div>
              <p className={`text-[10px] ${themeClasses.textTertiary} px-1`}>
                Set to <code className={`${accentClasses.textClass}`}>0</code> for unlimited uses.
              </p>
            </div>

            <div className="space-y-2">
              <Label className={`${themeClasses.textSecondary} text-sm`}>Expires In</Label>
              <Input
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                placeholder="e.g., 7d, 24h, never"
                className={`h-11 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} placeholder:${themeClasses.textTertiary} focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none rounded-xl`}
              />
              <p className={`text-[10px] ${themeClasses.textTertiary} px-1 flex justify-between items-center`}>
                <span>Format: <code className={`${accentClasses.textClass}`}>1d</code>, <code className={`${accentClasses.textClass}`}>12h</code>, or <code className={`${accentClasses.textClass}`}>never</code></span>
                {expiryDate && (
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 ${accentClasses.bgClass}/5 border border-${accentClasses.base}/20 rounded-md ${accentClasses.textClass} font-medium`}>
                    <span className={`w-1 h-1 rounded-full ${accentClasses.bgClass} animate-pulse`} />
                    Expires: {expiryDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label className={`${themeClasses.textSecondary} text-sm`}>Note (Optional)</Label>
              <div className="relative">
                <MessageSquare className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textTertiary}`} />
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., For new team members"
                  className={`pl-10 h-11 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} placeholder:${themeClasses.textTertiary} focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none rounded-xl`}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className={`flex-1 h-11 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} hover:${themeClasses.hoverBg} hover:${themeClasses.text} rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className={`flex-1 h-11 ${accentClasses.bgClass} hover:${accentClasses.bgHoverClass} text-black font-semibold rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0`}
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
