import React, { useState } from 'react';
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
  Settings,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from './context/ThemeContext';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Users', icon: Users, page: 'Users' },
  { name: 'Invites', icon: Ticket, page: 'Invites' },
  { name: 'Settings', icon: Settings, page: 'Settings' },
];

interface LayoutProps {
  children: React.ReactNode;
  currentPageName: string;
}

export default function Layout({ children, currentPageName }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, themeClasses, accentClasses } = useTheme();

  // Don't show layout on Login page
  if (currentPageName === 'Login') {
    return (
      <>
        <Toaster position="top-right" theme={theme === 'light' ? 'light' : 'dark'} />
        {children}
      </>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.bg} transition-all duration-300`}>
      <Toaster position="top-right" theme={theme === 'light' ? 'light' : 'dark'} />

      {/* Mobile Header */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-50 ${themeClasses.bg}/95 backdrop-blur-xl border-b ${themeClasses.divider} transition-colors duration-300`}>
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${accentClasses.bgClass} flex items-center justify-center transition-colors duration-300`}>
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className={`font-bold ${themeClasses.text} transition-colors duration-300`}>Guardian</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className={`${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors duration-300`}
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 ${themeClasses.bg} border-r ${themeClasses.divider}
        transform transition-all duration-300
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center justify-between h-16 px-6 border-b ${themeClasses.divider} transition-all duration-300`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${accentClasses.bgClass} flex items-center justify-center shadow-lg transition-all duration-300`}>
                <Shield className="w-5 h-5 text-black" />
              </div>
              <div>
                <span className={`font-bold ${themeClasses.text} transition-all duration-300`}>Guardian</span>
                <p className={`text-xs ${themeClasses.textTertiary} transition-all duration-300`}>Admin Panel</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className={`lg:hidden ${themeClasses.textSecondary} hover:${themeClasses.text} transition-all duration-300`}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    ${isActive
                      ? `${accentClasses.bgClass}/20 ${accentClasses.textClass} border-l-[3px] border-current shadow-sm`
                      : `${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                    }
                    ${isActive ? '' : `hover:${themeClasses.text}`}
                  `}
                >
                  <div className={`${isActive ? accentClasses.textClass : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`font-medium ${isActive ? accentClasses.textClass : ''}`}>{item.name}</span>
                  {isActive && <ChevronRight className={`w-4 h-4 ml-auto ${accentClasses.textClass}`} />}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={`p-4 border-t ${themeClasses.divider} transition-all duration-300`}>
            <div className={`p-4 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border} mb-4 transition-all duration-300`}>
              <p className={`${themeClasses.textTertiary} text-sm transition-all duration-300`}>Server Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className={`${themeClasses.text} text-sm font-medium transition-all duration-300`}>Operational</span>
              </div>
            </div>
            <Link
              to={createPageUrl('Login')}
              onClick={() => {
                localStorage.removeItem('guardian_token');
                localStorage.removeItem('guardian_user');
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl ${themeClasses.textSecondary} hover:text-red-400 hover:bg-red-500/5 transition-all duration-300`}
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 pt-16 lg:pt-0 transition-all duration-300">
        <div className="min-h-screen p-4 lg:p-8 transition-all duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
