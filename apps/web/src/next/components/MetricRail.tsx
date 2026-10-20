import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricRailItem {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: string;
  sub: string;
  icon?: string;
}

interface MetricRailProps {
  items: MetricRailItem[];
}

const trendMap: Record<string, { Icon: LucideIcon; cls: string }> = {
  up: { Icon: TrendingUp, cls: 'text-emerald-400' },
  down: { Icon: TrendingDown, cls: 'text-rose-400' },
  flat: { Icon: Minus, cls: 'text-muted-foreground' },
};

export default function MetricRail({ items }: MetricRailProps) {
  return (
    <div className="flex flex-col divide-y divide-border border border-border bg-card sm:flex-row sm:divide-x sm:divide-y-0">
      {items.map((s, i) => {
        const { Icon: TrendIcon, cls } = trendMap[s.trend] || trendMap.flat;
        return (
          <div
            key={s.id}
            className="group relative flex-1 p-5"
            style={{ animation: `fade-in-up 0.5s ${i * 0.05}s both` }}
          >
            <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
            <div className="flex items-center justify-between">
              <span className="text-eyebrow">{s.label}</span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground/40">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <p className="mt-3 font-heading text-[30px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
              {s.value}
            </p>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className={cn('flex items-center gap-1 font-mono text-[11px] font-medium tabular-nums', cls)}>
                <TrendIcon className="h-3 w-3" />
                {s.delta}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">{s.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
