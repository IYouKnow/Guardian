import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { authApi } from './api/auth';
import Login from './pages/Login';
import { ThemeProvider as ConsoleThemeProvider } from '@next/components/ThemeProvider';
import ConsoleLayout from '@next/components/Layout';
import Overview from '@next/pages/Overview';
import Users from '@next/pages/Users';
import Invitations from '@next/pages/Invitations';
import Storage from '@next/pages/Storage';
import Backups from '@next/pages/Backups';
import Settings from '@next/pages/Settings';
import Account from '@next/pages/Account';

// RequireAuth validates the stored token with the server once per app load so a
// stale session (expired, revoked, or removed account) can't render the admin
// UI with cached user info. A 401 from /auth/me clears the session and routes
// to login.
function RequireAuth() {
  const [state, setState] = useState<'checking' | 'authed' | 'anon'>(
    authApi.isAuthenticated() ? 'checking' : 'anon'
  );

  useEffect(() => {
    if (state !== 'checking') return;
    let active = true;
    authApi.me()
      .then(() => { if (active) setState('authed'); })
      .catch(() => {
        if (!active) return;
        authApi.logout();
        setState('anon');
      });
    return () => { active = false; };
  }, [state]);

  if (state === 'checking') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
      </div>
    );
  }

  if (state === 'anon') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// RequireAdmin sits inside RequireAuth, which has already validated the token
// via /auth/me and refreshed the cached role. This is a UX gate only: the server
// still enforces admin on every /api/admin/* route, so hiding the UI grants no
// privilege.
function RequireAdmin() {
  if (!authApi.isAdmin()) {
    return <Navigate to="/account" replace />;
  }
  return <Outlet />;
}

// RequireBackupAccess gates the personal (own-vault) backups view, which the
// operator enables with "Allow users to create backups". A UX gate: the server
// re-checks the setting on every personal backup route. Admin access to the
// server-wide view is gated by RequireAdmin instead.
function RequireBackupAccess() {
  if (authApi.canBackup()) {
    return <Outlet />;
  }
  // Admins who reach the personal URL without user backups enabled still have
  // the server-wide view.
  return <Navigate to={authApi.isAdmin() ? '/admin/backups' : '/account'} replace />;
}

function App() {
  return (
    <ThemeProvider>
      <ConsoleThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RequireAuth />}>
              <Route element={<ConsoleLayout />}>
                <Route path="/account" element={<Account />} />
                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<Overview />} />
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/invitations" element={<Invitations />} />
                  <Route path="/admin/storage" element={<Storage />} />
                  <Route path="/admin/backups" element={<Backups variant="admin" />} />
                  <Route path="/admin/settings" element={<Settings />} />
                </Route>
                <Route element={<RequireBackupAccess />}>
                  <Route path="/backups" element={<Backups variant="personal" />} />
                </Route>
              </Route>
            </Route>

            {/* Legacy URLs kept working for existing links/bookmarks. The admin
                pages moved under /admin; the old flat paths redirect there. */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/users" element={<Navigate to="/admin/users" replace />} />
            <Route path="/invitations" element={<Navigate to="/admin/invitations" replace />} />
            <Route path="/invites" element={<Navigate to="/admin/invitations" replace />} />
            <Route path="/storage" element={<Navigate to="/admin/storage" replace />} />
            <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
            <Route path="/backup" element={<Navigate to="/backups" replace />} />
            <Route path="/next" element={<Navigate to="/admin" replace />} />
            <Route path="/next/users" element={<Navigate to="/admin/users" replace />} />
            <Route path="/next/invitations" element={<Navigate to="/admin/invitations" replace />} />
            <Route path="/next/storage" element={<Navigate to="/admin/storage" replace />} />
            <Route path="/next/backups" element={<Navigate to="/backups" replace />} />
            <Route path="/next/settings" element={<Navigate to="/admin/settings" replace />} />
            <Route path="/next/account" element={<Navigate to="/account" replace />} />

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </ConsoleThemeProvider>
    </ThemeProvider>
  );
}

export default App;
