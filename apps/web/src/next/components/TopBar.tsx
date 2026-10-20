import { useEffect } from 'react';
import { Search, Sun, Moon, Bell, Command } from 'lucide-react';
import { useTheme } from '@next/components/ThemeProvider';
import { useTheme as useSharedTheme } from '@/context/ThemeContext';
import { useSSE } from '@/hooks/useSSE';
import { useLocation, Link } from 'react-router-dom';
import { navItems, currentAdmin } from '@next/lib/mockData';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@next/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@next/components/ui/avatar';
import { cn } from '@/lib/utils';
import { authApi } from '@/api/auth';

function Crumbs() {
  const { pathname } = useLocation();
  const current = navItems.find((n) => n.path === pathname) || navItems[0];
  return (
    <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em]">
      <span className="text-muted-foreground/60">Guardian</span>
      <span className="text-muted-foreground/30">/</span>
      <span className="text-foreground">{current.label}</span>
    </div>
  );
}

const iconBtn =
  'grid h-8 w-8 place-items-center border border-border bg-transparent text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground';

interface TopBarProps {
  onOpenCommand: () => void;
}

export default function TopBar({ onOpenCommand }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { isSyncing, lastEvent } = useSSE();
  const { refetchPreferences } = useSharedTheme();

  // Live server events: refresh appearance preferences when the server reports a change.
  useEffect(() => {
    if (lastEvent?.type === 'prefs_updated') {
      refetchPreferences?.();
    }
  }, [lastEvent, refetchPreferences]);

  // Show the real signed-in user; fall back to the mock admin when no session is
  // available. The console is mounted behind apps/web's real auth gate.
  const sessionUser = authApi.getStoredUser();
  const displayName = sessionUser?.username || currentAdmin.name;
  const displayEmail = sessionUser?.email || currentAdmin.email;
  const displayRole = sessionUser
    ? (sessionUser.is_admin ? 'Administrator' : 'User')
    : currentAdmin.role;
  const displayInitials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = () => {
    authApi.logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-6">
      <Crumbs />

      <div className="ml-auto flex items-center gap-2">
        {/* Search trigger */}
        <button
          onClick={onOpenCommand}
          className="group hidden items-center gap-2.5 border border-border bg-card/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="pr-6">Search…</span>
          <kbd className="flex items-center gap-0.5 border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
        <button onClick={onOpenCommand} className={cn(iconBtn, 'sm:hidden')} aria-label="Search">
          <Search className="h-4 w-4" />
        </button>

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        {/* Live sync status (WebSocket /ws/events) */}
        <span
          className={cn('hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider sm:flex', isSyncing ? 'text-primary' : 'text-muted-foreground')}
          title="Live updates from the server"
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', isSyncing ? 'animate-pulse bg-primary' : 'bg-emerald-400')} />
          {isSyncing ? 'Syncing' : 'Live'}
        </span>

        {/* Theme toggle */}
        <button onClick={toggleTheme} className={iconBtn} aria-label="Toggle theme">
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <button className={cn(iconBtn, 'relative')} aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-primary" />
        </button>

        {/* Account menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2.5 border border-border bg-transparent py-1 pl-1 pr-2.5 transition-colors hover:border-foreground/25">
              <Avatar className="h-6 w-6 rounded-none">
                <AvatarFallback className="rounded-none bg-primary/10 font-mono text-[10px] font-semibold text-primary">{displayInitials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-[11px] font-medium leading-tight text-foreground">{displayName}</p>
                <p className="font-mono text-[9px] uppercase leading-tight tracking-wider text-muted-foreground">{displayRole}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-sm">
            <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
              <Avatar className="h-8 w-8 rounded-none">
                <AvatarFallback className="rounded-none bg-primary/10 font-mono text-xs font-semibold text-primary">{displayInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{displayEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-[13px]"><Link to="/account">Profile & account</Link></DropdownMenuItem>
            <DropdownMenuItem asChild className="text-[13px]"><Link to="/account">API keys</Link></DropdownMenuItem>
            <DropdownMenuItem className="text-[13px]">Audit log</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut} className="text-[13px] text-destructive focus:text-destructive">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
