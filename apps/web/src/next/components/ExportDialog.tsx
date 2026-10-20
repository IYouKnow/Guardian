import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@next/components/ui/dialog';
import { Button } from '@next/components/ui/button';
import { Label } from '@next/components/ui/label';
import { Check, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExportOptions {
  statuses: string[];
  sinceDays: number | null;
  toggle: boolean;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  statuses: string[];
  toggleLabel: string;
  toggleHint: string;
  onExport: (options: ExportOptions) => void;
}

const chip = (active: boolean) => cn(
  'border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
  active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
);

const RANGES: { id: number | null; label: string }[] = [
  { id: null, label: 'All time' },
  { id: 7, label: 'Last 7 days' },
  { id: 30, label: 'Last 30 days' },
];

/** Console-native export dialog shared by the Users and Invitations pages. */
export default function ExportDialog({
  open, onOpenChange, title, description, statuses, toggleLabel, toggleHint, onExport,
}: ExportDialogProps) {
  const [selected, setSelected] = useState<string[]>(statuses);
  const [sinceDays, setSinceDays] = useState<number | null>(null);
  const [toggle, setToggle] = useState(false);

  const toggleStatus = (status: string) => setSelected((prev) => (
    prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
  ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-sm border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-base">
            <Download className="h-4 w-4 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription className="text-[13px]">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-eyebrow">Status</Label>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button key={status} onClick={() => toggleStatus(status)} className={chip(selected.includes(status))}>
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-eyebrow">Timeframe</Label>
            <div className="flex flex-wrap gap-2">
              {RANGES.map((range) => (
                <button key={range.label} onClick={() => setSinceDays(range.id)} className={chip(sinceDays === range.id)}>
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setToggle((t) => !t)}
            className="flex w-full items-center gap-3 border border-border bg-background/50 p-3 text-left transition-colors hover:border-foreground/25"
          >
            <span className={cn(
              'grid h-4 w-4 shrink-0 place-items-center border',
              toggle ? 'border-primary bg-primary/20 text-primary' : 'border-border text-transparent'
            )}>
              <Check className="h-3 w-3" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-foreground">{toggleLabel}</span>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{toggleHint}</span>
            </span>
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-sm border-border bg-background font-mono text-[11px] uppercase tracking-wider"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="gap-1.5 rounded-sm bg-primary font-mono text-[11px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            onClick={() => onExport({ statuses: selected, sinceDays, toggle })}
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
