import { cn } from '@/lib/utils';

/**
 * Small "SOON" tag for UI that is present but not yet wired to the backend, so
 * nothing on screen is silently dead.
 */
export function MockBadge({ label = 'Soon', className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border border-border bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 bg-current" />
      {label}
    </span>
  );
}

export default MockBadge;
