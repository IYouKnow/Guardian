import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Users,
  Ticket,
  Settings,
  HardDrive,
  ShieldCheck,
  UserPlus,
  KeyRound,
  LogOut,
  X,
  CornerDownLeft,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: 'navigation' | 'action' | 'shortcut';
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { themeClasses } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View system overview',
      icon: LayoutDashboard,
      action: () => navigate(createPageUrl('Dashboard')),
      category: 'navigation',
      shortcut: 'GD',
    },
    {
      id: 'nav-users',
      label: 'Go to Users',
      description: 'Manage user accounts',
      icon: Users,
      action: () => navigate(createPageUrl('Users')),
      category: 'navigation',
      shortcut: 'GU',
    },
    {
      id: 'nav-invites',
      label: 'Go to Invites',
      description: 'Manage invite codes',
      icon: Ticket,
      action: () => navigate(createPageUrl('Invites')),
      category: 'navigation',
      shortcut: 'GI',
    },
    {
      id: 'nav-storage',
      label: 'Go to Storage',
      description: 'View storage metrics',
      icon: HardDrive,
      action: () => navigate(createPageUrl('Storage')),
      category: 'navigation',
    },
    {
      id: 'nav-backup',
      label: 'Go to Backup',
      description: 'Manage backups',
      icon: ShieldCheck,
      action: () => navigate(createPageUrl('Backup')),
      category: 'navigation',
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Configure preferences',
      icon: Settings,
      action: () => navigate(createPageUrl('Settings')),
      category: 'navigation',
      shortcut: 'GS',
    },
    {
      id: 'action-create-user',
      label: 'Create User',
      description: 'Add a new admin user',
      icon: UserPlus,
      action: () => {
        navigate(createPageUrl('Users'));
        onOpenChange(false);
      },
      category: 'action',
    },
    {
      id: 'action-create-invite',
      label: 'Create Invite',
      description: 'Generate new invite code',
      icon: KeyRound,
      action: () => {
        navigate(createPageUrl('Invites'));
        onOpenChange(false);
      },
      category: 'action',
    },
    {
      id: 'action-logout',
      label: 'Sign Out',
      description: 'Log out of the panel',
      icon: LogOut,
      action: () => {
        localStorage.removeItem('guardian_token');
        localStorage.removeItem('guardian_user');
        navigate(createPageUrl('Login'));
      },
      category: 'action',
    },
  ], [navigate, onOpenChange]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  const navigationCommands = useMemo(
    () => filteredCommands.filter((c) => c.category === 'navigation'),
    [filteredCommands]
  );
  const actionCommands = useMemo(
    () => filteredCommands.filter((c) => c.category === 'action'),
    [filteredCommands]
  );

  const [lastQuery, setLastQuery] = useState('');

  useEffect(() => {
    if (query !== lastQuery) {
      setLastQuery(query);
      setSelectedIndex(0);
    }
  }, [query, lastQuery]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onOpenChange(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [open, filteredCommands, selectedIndex, onOpenChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const selectedEl = list.querySelector('[data-selected="true"]');
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
        onClick={() => onOpenChange(false)}
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className={`
            relative w-full max-w-xl
            ${themeClasses.sectionBg}
            border ${themeClasses.border}
            rounded-xl shadow-2xl
            overflow-hidden
          `}
        >
          <div className={`flex items-center gap-3 px-4 py-3 border-b ${themeClasses.divider}`}>
            <Search className={`w-4 h-4 ${themeClasses.textSecondary}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands..."
              autoFocus
              className={`
                flex-1 bg-transparent text-sm
                ${themeClasses.text}
                placeholder:${themeClasses.textSecondary}
                focus:outline-none
              `}
            />
            <div className={`flex items-center gap-1`}>
              <kbd className={`
                px-1.5 py-0.5 text-[10px] font-mono
                ${themeClasses.textSecondary}
                ${themeClasses.sectionBg}
                border ${themeClasses.border}
                rounded
              `}>
                ESC
              </kbd>
            </div>
          </div>

          <div ref={listRef} className="max-h-[300px] overflow-y-auto scrollbar-hide scroll-smooth">
            {filteredCommands.length === 0 ? (
              <div className={`px-4 py-8 text-center ${themeClasses.textSecondary}`}>
                <p className="text-sm">No commands found</p>
              </div>
            ) : (
              <div className="p-2">
                {navigationCommands.length > 0 && (
                  <div className="mb-2">
                    <p className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${themeClasses.textTertiary}`}>
                      Navigation
                    </p>
                    {navigationCommands.map((cmd) => (
                      <CommandItemRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={filteredCommands[selectedIndex]?.id === cmd.id}
                        onSelect={() => {
                          cmd.action();
                          onOpenChange(false);
                        }}
                        themeClasses={themeClasses}
                      />
                    ))}
                  </div>
                )}

                {actionCommands.length > 0 && (
                  <div>
                    <p className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${themeClasses.textTertiary}`}>
                      Actions
                    </p>
                    {actionCommands.map((cmd) => (
                      <CommandItemRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={filteredCommands[selectedIndex]?.id === cmd.id}
                        onSelect={() => {
                          cmd.action();
                          onOpenChange(false);
                        }}
                        themeClasses={themeClasses}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`flex items-center justify-between px-4 py-2 border-t ${themeClasses.divider}`}>
            <div className={`flex items-center gap-4 text-[10px] ${themeClasses.textTertiary}`}>
              <span className="flex items-center gap-1">
                <kbd className={`px-1 py-0.5 ${themeClasses.sectionBg} border ${themeClasses.border} rounded`}>↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className={`px-1 py-0.5 ${themeClasses.sectionBg} border ${themeClasses.border} rounded`}><CornerDownLeft className="w-2.5 h-2.5" /></kbd>
                select
              </span>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className={`p-1 rounded ${themeClasses.hoverBg}`}
            >
              <X className={`w-3 h-3 ${themeClasses.textSecondary}`} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface CommandItemRowProps {
  command: CommandItem;
  isSelected: boolean;
  onSelect: () => void;
  themeClasses: ReturnType<typeof useTheme>['themeClasses'];
}

function CommandItemRow({ command, isSelected, onSelect, themeClasses }: CommandItemRowProps) {
  const Icon = command.icon;

  return (
    <button
      onClick={onSelect}
      data-selected={isSelected}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg
        transition-colors duration-100
        hover:bg-white/5
        ${isSelected ? 'bg-white/10' : ''}
      `}
    >
      <Icon className={`w-4 h-4 ${themeClasses.textSecondary}`} />
      <div className="flex-1 text-left">
        <p className={`text-sm ${themeClasses.text}`}>
          {command.label}
        </p>
        {command.description && (
          <p className={`text-xs ${themeClasses.textTertiary}`}>
            {command.description}
          </p>
        )}
      </div>
      {command.shortcut && (
        <div className="flex items-center gap-0.5">
          {command.shortcut.split('').map((char, i) => (
            <kbd
              key={i}
              className={`
                px-1 py-0.5 text-[10px] font-mono
                text-white/80
                bg-white/10
                border border-white/10
                rounded
              `}
            >
              {char}
            </kbd>
          ))}
        </div>
      )}
    </button>
  );
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
}