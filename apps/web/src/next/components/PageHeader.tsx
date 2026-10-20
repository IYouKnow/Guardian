import type { ReactNode } from 'react';
import { Badge } from '@next/components/ui/badge';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  eyebrow?: ReactNode;
}

export default function PageHeader({ title, description, actions, badge, eyebrow }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-eyebrow mb-2.5">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-[26px] font-semibold leading-none tracking-tight text-foreground md:text-[30px]">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-2.5 max-w-2xl text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-400',
    ACTIVE: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-400',
    healthy: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-400',
    pending: 'border-amber-500/35 bg-amber-500/[0.08] text-amber-400',
    warning: 'border-amber-500/35 bg-amber-500/[0.08] text-amber-400',
    partial: 'border-amber-500/35 bg-amber-500/[0.08] text-amber-400',
    suspended: 'border-rose-500/35 bg-rose-500/[0.08] text-rose-400',
    SUSPENDED: 'border-rose-500/35 bg-rose-500/[0.08] text-rose-400',
    critical: 'border-rose-500/35 bg-rose-500/[0.08] text-rose-400',
    failed: 'border-rose-500/35 bg-rose-500/[0.08] text-rose-400',
    expired: 'border-zinc-500/35 bg-zinc-500/[0.08] text-zinc-400',
    EXPIRED: 'border-zinc-500/35 bg-zinc-500/[0.08] text-zinc-400',
    revoked: 'border-zinc-500/35 bg-zinc-500/[0.08] text-zinc-400',
    REVOKED: 'border-zinc-500/35 bg-zinc-500/[0.08] text-zinc-400',
    DISABLED: 'border-zinc-500/35 bg-zinc-500/[0.08] text-zinc-400',
    USED: 'border-sky-500/35 bg-sky-500/[0.08] text-sky-400',
    disconnected: 'border-zinc-500/35 bg-zinc-500/[0.08] text-zinc-400',
    accepted: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-400',
    degraded: 'border-amber-500/35 bg-amber-500/[0.08] text-amber-400',
    connected: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-400',
    success: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-400',
  };
  const cls = styles[status] || 'border-border bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      <span className="h-1.5 w-1.5 bg-current" />
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: 'border-primary/40 bg-primary/[0.08] text-primary',
    Admin: 'border-primary/40 bg-primary/[0.08] text-primary',
    manager: 'border-sky-500/35 bg-sky-500/[0.08] text-sky-400',
    user: 'border-border bg-muted text-muted-foreground',
    User: 'border-border bg-muted text-muted-foreground',
  };
  return (
    <Badge variant="outline" className={`rounded-sm border ${styles[role] || styles.user} font-mono text-[10px] font-medium uppercase tracking-wider`}>
      {role}
    </Badge>
  );
}
