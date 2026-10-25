import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@next/components/ui/command';
import { navSectionsFor, users } from '@next/lib/mockData';
import { Icon } from '@next/components/Icon';
import { authApi } from '@/api/auth';
import { Search, ArrowRight } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const isAdmin = authApi.isAdmin();
  const sections = navSectionsFor(isAdmin, authApi.canBackup());
  // Continuous numbering across the sections.
  const navOrder = new Map(sections.flatMap((s) => s.items).map((item, i) => [item.id, i + 1] as const));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="max-w-xl rounded-sm border-border">
      <CommandInput placeholder="Search vaults, users, pages, run commands…" className="font-mono text-[13px]" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty className="font-mono text-[11px] uppercase tracking-wider">No results found.</CommandEmpty>

        {sections.map((section) => (
          <CommandGroup key={section.id} heading={section.label}>
            {section.items.map((item) => (
              <CommandItem key={item.id} onSelect={() => go(item.path)} className="gap-3 rounded-sm">
                <span className="w-4 font-mono text-[10px] tabular-nums text-muted-foreground/50">{String(navOrder.get(item.id) ?? 0).padStart(2, '0')}</span>
                <Icon name={item.icon} className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {isAdmin && (
          <>
            <CommandGroup heading="Users">
              {users.slice(0, 5).map((u) => (
                <CommandItem key={u.id} onSelect={() => go('/admin/users')} className="gap-3 rounded-sm">
                  <span className="grid h-6 w-6 place-items-center border border-border bg-primary/10 font-mono text-[10px] font-semibold text-primary">{u.avatar}</span>
                  <span className="flex-1">{u.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{u.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => go('/backups')} className="gap-3 rounded-sm">
                <Icon name="HardDrive" className="h-4 w-4 text-muted-foreground" />
                <span>Backups &amp; Google Drive</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </CommandItem>
              <CommandItem onSelect={() => go('/admin/invitations')} className="gap-3 rounded-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span>Invite new user</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </CommandItem>
              <CommandItem onSelect={() => go('/admin/settings')} className="gap-3 rounded-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span>Open settings</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
