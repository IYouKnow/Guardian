import { useState, useEffect } from 'react';
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
import { Shield, User, Globe, Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { adminApi, type AdminUser } from '@/api/admin';
import { toast } from 'sonner';

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onUpdated: () => void;
}

export default function EditUserModal({ open, onOpenChange, user, onUpdated }: EditUserModalProps) {
  const { themeClasses, accentClasses } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [maxWsPerIP, setMaxWsPerIP] = useState('0');
  const [status, setStatus] = useState('ACTIVE');

  useEffect(() => {
    if (user) {
      setMaxWsPerIP(String(user.max_ws_per_ip ?? 0));
      setStatus(user.status);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await adminApi.updateUser(user.id, {
        max_ws_per_ip: parseInt(maxWsPerIP) || 0,
        status,
      });
      toast.success('User updated successfully');
      onUpdated();
      onOpenChange(false);
    } catch (error) {
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${themeClasses.sectionBg} border ${themeClasses.border} ${themeClasses.text} backdrop-blur-xl max-w-md`}>
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold flex items-center gap-2 ${themeClasses.text}`}>
            <div className={`p-2 rounded-lg ${accentClasses.bgClass}/10`}>
              <Shield className={`w-5 h-5 ${accentClasses.textClass}`} />
            </div>
            Edit User: {user.friendly_name || user.username}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label className={`${themeClasses.textSecondary} text-sm`}>Status</Label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textTertiary} z-10`} />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={`h-11 pl-10 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} ${accentClasses.focusRingClass} rounded-xl`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={`${themeClasses.sectionBg} border ${themeClasses.border} backdrop-blur-xl`}>
                  <SelectItem value="ACTIVE" className={`${themeClasses.text} hover:${themeClasses.hoverBg}`}>ACTIVE</SelectItem>
                  <SelectItem value="DISABLED" className={`${themeClasses.text} hover:${themeClasses.hoverBg}`}>DISABLED</SelectItem>
                  <SelectItem value="SUSPENDED" className={`${themeClasses.text} hover:${themeClasses.hoverBg}`}>SUSPENDED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className={`${themeClasses.textSecondary} text-sm`}>WebSocket Limit (per IP)</Label>
            <div className="relative">
              <Globe className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textTertiary}`} />
              <Input
                type="number"
                min="0"
                placeholder="0 = use global default"
                value={maxWsPerIP}
                onChange={(e) => setMaxWsPerIP(e.target.value)}
                className={`pl-10 h-11 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} placeholder:${themeClasses.textTertiary} focus:${accentClasses.focusBorderClass}/50 rounded-xl`}
              />
            </div>
            <p className={`${themeClasses.textTertiary} text-xs mt-1`}>
              Set to 0 to use the global default from server settings.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={`flex-1 h-11 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} hover:${themeClasses.hoverBg} hover:${themeClasses.text} rounded-xl`}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={`flex-1 h-11 ${accentClasses.bgClass} hover:${accentClasses.bgHoverClass} text-black font-semibold rounded-xl`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
