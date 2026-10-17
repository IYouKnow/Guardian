import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { authApi } from './api/auth';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/users';
import Invites from './pages/invites';
import Settings from './pages/Settings';
import Storage from './pages/Storage';
import Backup from './pages/Backup';
import { getPageNameFromPath } from './utils';

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
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
      </div>
    );
  }

  if (state === 'anon') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const currentPageName = getPageNameFromPath(location.pathname);
  return <Layout currentPageName={currentPageName}>{children}</Layout>;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <Layout currentPageName="Login">
                <Login />
              </Layout>
            }
          />
          <Route element={<RequireAuth />}>
            <Route
              path="/dashboard"
              element={
                <LayoutWrapper>
                  <Dashboard />
                </LayoutWrapper>
              }
            />
            <Route
              path="/users"
              element={
                <LayoutWrapper>
                  <Users />
                </LayoutWrapper>
              }
            />
            <Route
              path="/invites"
              element={
                <LayoutWrapper>
                  <Invites />
                </LayoutWrapper>
              }
            />
            <Route
              path="/settings"
              element={
                <LayoutWrapper>
                  <Settings />
                </LayoutWrapper>
              }
            />
            <Route
              path="/storage"
              element={
                <LayoutWrapper>
                  <Storage />
                </LayoutWrapper>
              }
            />
            <Route
              path="/backup"
              element={
                <LayoutWrapper>
                  <Backup />
                </LayoutWrapper>
              }
            />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
