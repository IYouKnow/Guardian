import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MockBadgeProps {
    label?: string;
    className?: string;
}

// Small pill used to flag nav entries and page headers whose data is not yet
// wired to the server.
export function MockBadge({ label = 'Mock', className }: MockBadgeProps) {
    return (
        <span
            title="Placeholder data — not yet connected to the server"
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500',
                className
            )}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {label}
        </span>
    );
}

interface MockNoticeProps {
    children: ReactNode;
    className?: string;
}

// Page-level banner explaining that everything below it is simulated.
export function MockNotice({ children, className }: MockNoticeProps) {
    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-amber-500',
                className
            )}
        >
            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-xs font-medium leading-relaxed">{children}</p>
        </div>
    );
}
