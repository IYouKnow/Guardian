import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  LayoutDashboard,
  Users,
  Ticket,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Settings,
  HardDrive,
  ShieldCheck,
  Command,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from './context/ThemeContext';
import { useSSE } from './hooks/useSSE';
import { SyncIndicator } from "@guardian/shared";
import { Breadcrumbs } from './components/Breadcrumbs';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', description: 'System overview' },
  { name: 'Users', icon: Users, page: 'Users', description: 'Manage admin accounts' },
  { name: 'Invites', icon: Ticket, page: 'Invites', description: 'Manage invite codes' },
  { name: 'Storage', icon: HardDrive, page: 'Storage', description: 'Storage metrics' },
  { name: 'Backup', icon: ShieldCheck, page: 'Backup', description: 'Manage backups' },
  { name: 'Settings', icon: Settings, page: 'Settings', description: 'Configure preferences' },
];

const pageDescriptions: Record<string, string> = {
  Dashboard: 'System health & activity summary',
  Users: 'Manage admin accounts & permissions',
  Invites: 'Generate and track access tokens',
  Storage: 'Monitor vault storage usage',
  Backup: 'Configure and monitor backups',
  Settings: 'Configure preferences & appearance',
};

interface LayoutProps {
  children: React.ReactNode;
  currentPageName: string;
}

export default function Layout({ children, currentPageName }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, themeClasses, accentClasses, refetchPreferences } = useTheme();
  const { isSyncing, lastEvent } = useSSE();
  const { isOpen: commandPaletteOpen, setIsOpen: setCommandPaletteOpen } = useCommandPalette();

  const currentNavItem = navItems.find((item) => item.page === currentPageName);

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'prefs_updated') {
      console.log('[SSE] Preferences updated. Refetching...');
      refetchPreferences?.();
    }
  }, [lastEvent, refetchPreferences]);

  if (currentPageName === 'Login') {
    return (
      <>
        <Toaster position="bottom-right" theme={theme === 'light' ? 'light' : 'dark'} />
        {children}
      </>
    );
  }

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';

  return (
    <div className={`h-screen overflow-hidden ${themeClasses.bg} transition-all duration-300`}>
      <Toaster position="bottom-right" theme={theme === 'light' ? 'light' : 'dark'} />
      <SyncIndicator isSyncing={isSyncing} variant="full" />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      <div className={`lg:hidden fixed top-0 left-0 right-0 z-50 ${themeClasses.bg}/95 backdrop-blur-xl border-b ${themeClasses.divider} transition-colors duration-300`}>
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${accentClasses.bgClass} flex items-center justify-center transition-colors duration-300`}>
              <Shield className={`w-4 h-4 ${accentClasses.onContrastClass}`} />
            </div>
            <span className={`font-semibold ${themeClasses.text} text-sm transition-all duration-300`}>Guardian</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCommandPaletteOpen(true)}
              className={`w-8 h-8 ${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors duration-300`}
            >
              <Command className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className={`${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors duration-300`}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className={`px-4 pb-3 ${themeClasses.textSecondary}`}>
          <Breadcrumbs items={[{ label: currentPageName }]} />
        </div>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed top-0 left-0 z-50 h-full ${sidebarWidth} ${themeClasses.bg} border-r ${themeClasses.divider}
        transform transition-all duration-200
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarCollapsed ? 'lg:w-16' : ''}
      `}>
        <div className="flex flex-col h-full">
          <div className={`flex items-center justify-between h-14 px-4 border-b ${themeClasses.divider} transition-all duration-200`}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${accentClasses.bgClass} flex items-center justify-center transition-colors duration-300`}>
                  <Shield className={`w-4 h-4 ${accentClasses.onContrastClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-semibold ${themeClasses.text} text-sm transition-all duration-300 block leading-tight`}>Guardian</span>
                  <span className={`text-xs ${themeClasses.textTertiary} transition-all duration-300`}>Admin Panel</span>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className={`w-8 h-8 mx-auto rounded-lg ${accentClasses.bgClass} flex items-center justify-center`}>
                <Shield className={`w-4 h-4 ${accentClasses.onContrastClass}`} />
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`
                  hidden lg:flex w-7 h-7
                  ${themeClasses.textTertiary} hover:${themeClasses.text}
                  transition-all duration-200
                `}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className={`lg:hidden ${themeClasses.textSecondary} hover:${themeClasses.text} transition-all duration-300`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <nav className={`flex-1 p-2 lg:p-3 space-y-0.5 overflow-y-auto scrollbar-hide`}>
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150
                    ${isActive
                      ? `${accentClasses.bgClass} ${accentClasses.onContrastClass}`
                      : `${themeClasses.textSecondary} ${themeClasses.hoverBg} hover:${themeClasses.text}`
                    }
                  `}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? accentClasses.onContrastClass : ''}`} />
                  {!sidebarCollapsed && (
                    <>
                      <span className={`text-sm font-medium ${isActive ? accentClasses.onContrastClass : ''}`}>{item.name}</span>
                      {isActive && <ChevronRight className={`w-3.5 h-3.5 ml-auto ${accentClasses.onContrastClass}`} />}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {(() => {
            const storedUser = localStorage.getItem('guardian_user');
            const user = storedUser ? JSON.parse(storedUser) : null;
            const username = user?.username || 'User';
            const role = user?.is_admin ? 'Admin' : 'User';
            const initial = username.charAt(0).toUpperCase();

            return (
              <div className={`p-2 lg:p-3 border-t ${themeClasses.divider} transition-all duration-300`}>
                <div className={`
                  flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg 
                  ${themeClasses.sectionBg} border ${themeClasses.border}
                  transition-all duration-300
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}>
                  <div className={`w-8 h-8 rounded-lg ${accentClasses.bgClass} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-sm font-semibold ${accentClasses.onContrastClass}`}>{initial}</span>
                  </div>
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className={`${themeClasses.text} text-sm font-medium truncate transition-all duration-300`}>{username}</p>
                      <p className={`${themeClasses.textTertiary} text-xs transition-all duration-300`}>{role}</p>
                    </div>
                  )}
                  <Link
                    to={createPageUrl('Login')}
                    onClick={() => {
                      localStorage.removeItem('guardian_token');
                      localStorage.removeItem('guardian_user');
                    }}
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-lg 
                      ${themeClasses.textTertiary} hover:text-red-400 hover:bg-red-500/10 
                      transition-all duration-200 flex-shrink-0
                      ${sidebarCollapsed ? 'hidden lg:flex' : ''}
                    `}
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </aside>

      <main className={`
        lg:pl-64 h-full pt-16 lg:pt-0 transition-all duration-200
        ${sidebarCollapsed ? 'lg:pl-16' : ''}
      `}>
        <div className="p-4 lg:p-6 space-y-4 overflow-y-auto scrollbar-hide h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPageName}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:block"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className={`text-xl font-semibold ${themeClasses.text} transition-all duration-300`}>
                    {currentNavItem?.name || currentPageName}
                  </h1>
                  <p className={`${themeClasses.textSecondary} text-sm transition-all duration-300`}>
                    {pageDescriptions[currentPageName]}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommandPaletteOpen(true)}
                  className={`
                    hidden lg:flex items-center gap-2 w-auto h-8 px-3
                    ${themeClasses.textSecondary} ${themeClasses.hoverBg}
                    text-xs transition-all duration-200
                  `}
                >
                  <Command className="w-3 h-3" />
                  <span>Command</span>
                  <kbd className={`
                    px-1.5 py-0.5 text-[10px] font-mono
                    ${themeClasses.textTertiary}
                    ${themeClasses.sectionBg} border ${themeClasses.border}
                    rounded
                  `}>
                    Ctrl+K
                  </kbd>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>

          {children}
        </div>
      </main>
    </div>
  );
}