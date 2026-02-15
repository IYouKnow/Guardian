import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { authApi } from './api/auth';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/users';
import Invites from './pages/invites';
import Settings from './pages/Settings';
import Storage from './pages/Storage';
import { getPageNameFromPath } from './utils';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authApi.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
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
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <Dashboard />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <Users />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invites"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <Invites />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <Settings />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/storage"
            element={
              <ProtectedRoute>
                <LayoutWrapper>
                  <Storage />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
