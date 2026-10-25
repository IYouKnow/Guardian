import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Lock, ChevronsLeft } from 'lucide-react';
import { navSectionsFor, platformMeta } from '@next/lib/mockData';
import { useServerHealth } from '@next/lib/useServerHealth';
import { Icon } from '@next/components/Icon';
import { authApi } from '@/api/auth';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const { version } = useServerHealth();
  // Personal holds every account's own items; the Admin section is added for
  // admins. Routes are gated by RequireAdmin / RequireBackupAccess as well.
  const sections = navSectionsFor(authApi.isAdmin(), authApi.canAccessBackups());

  return (
    <aside
      className={cn(
        'relative z-30 flex h-screen flex-col border-r border-sidebar-border bg-sidebar-background transition-[width] duration-300 ease-out',
        collapsed ? 'w-[62px]' : 'w-[236px]'
      )}
    >
      {/* Brand */}
      <div className={cn('flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border', collapsed ? 'justify-center px-0' : 'px-4')}>
        <div className="grid h-8 w-8 shrink-0 place-items-center border border-primary/45 bg-primary/5">
          <Lock className="h-4 w-4 text-primary" strokeWidth={2} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-heading text-[13px] font-semibold uppercase leading-tight tracking-[0.16em] text-foreground">
              Guardian
            </p>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              {platformMeta.tagline}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto py-4">
        {sections.map((section, index) => (
          <div key={section.id} className={cn(index > 0 && 'mt-5')}>
            {!collapsed ? (
              <p className="text-eyebrow px-4 pb-3">{section.label}</p>
            ) : (
              index > 0 && <div className="mx-3 mb-3 border-t border-sidebar-border" />
            )}
            <div className="space-y-px px-2">
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onMouseEnter={() => setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 py-2 text-[13px] font-medium transition-colors duration-150',
                      collapsed ? 'justify-center px-0' : 'px-2.5',
                      active
                        ? 'bg-sidebar-accent text-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
                    )}
                  >
                    {active && <span className="absolute left-0 top-0 h-full w-[2px] bg-primary" />}
                    <Icon name={item.icon} className={cn('h-[17px] w-[17px] shrink-0', active && 'text-primary')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {collapsed && hovered === item.id && (
                      <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap border border-border bg-popover px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-popover-foreground">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Status footer */}
      {!collapsed ? (
        <div className="border-t border-sidebar-border px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-foreground">Systems operational</p>
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                {version ? `v${version}` : '—'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid place-items-center border-t border-sidebar-border py-4">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-[13px] top-[70px] z-40 grid h-[26px] w-[26px] place-items-center border border-sidebar-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        aria-label="Toggle sidebar"
      >
        <ChevronsLeft className={cn('h-3.5 w-3.5 transition-transform duration-300', collapsed && 'rotate-180')} />
      </button>
    </aside>
  );
}
