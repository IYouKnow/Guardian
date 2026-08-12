import { useState } from 'react';
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
import { useTheme } from '../../context/ThemeContext';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateUserModal({ open, onOpenChange }: CreateUserModalProps) {
  const { themeClasses, accentClasses } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${themeClasses.sectionBg} border ${themeClasses.border} ${themeClasses.text} backdrop-blur-xl max-w-md`}>
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold flex items-center gap-2 ${themeClasses.text}`}>
            <div className={`p-2 rounded-lg ${accentClasses.bgClass}/10`}>
              <User className={`w-5 h-5 ${accentClasses.textClass}`} />
            </div>
            Create New User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label className={`${themeClasses.textSecondary} text-sm`}>Full Name</Label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textTertiary}`} />
              <Input
                placeholder="Enter full name"
                className={`pl-10 h-11 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} placeholder:${themeClasses.textTertiary} focus:${accentClasses.focusBorderClass}/50 rounded-xl`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className={`${themeClasses.textSecondary} text-sm`}>Email Address</Label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textTertiary}`} />
              <Input
                type="email"
                placeholder="Enter email address"
                className={`pl-10 h-11 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} placeholder:${themeClasses.textTertiary} focus:${accentClasses.focusBorderClass}/50 rounded-xl`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className={`${themeClasses.textSecondary} text-sm`}>Role</Label>
            <Select defaultValue="user">
              <SelectTrigger className={`h-11 ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.text} ${accentClasses.focusRingClass} rounded-xl`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={`${themeClasses.sectionBg} border ${themeClasses.border} backdrop-blur-xl`}>
                <SelectItem value="user" className={`${themeClasses.text} hover:${themeClasses.hoverBg}`}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" /> User
                  </div>
                </SelectItem>
                <SelectItem value="admin" className={`${themeClasses.text} hover:${themeClasses.hoverBg}`}>
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
                'Create User'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
