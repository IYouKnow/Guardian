import {
  LayoutDashboard, Users, Mail, Database, Archive, Settings, UserCircle,
  Shield, Server, Cloud, HardDrive, Activity, Upload, Download, Share2,
  Trash2, RefreshCw, Lock, FileText, Folder, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const map: Record<string, LucideIcon> = {
  LayoutDashboard, Users, Mail, Database, Archive, Settings, UserCircle,
  Shield, Server, Cloud, HardDrive, Activity, Upload, Download, Share2,
  Trash2, RefreshCw, Lock, FileText, Folder, Zap,
};

interface IconProps {
  name: string;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, className, strokeWidth = 1.75 }: IconProps) {
  const Cmp = map[name] || Shield;
  return <Cmp className={className} strokeWidth={strokeWidth} />;
}
