/**
 * Creates a URL path for a given page name
 */
export function createPageUrl(pageName: string): string {
  const pageMap: Record<string, string> = {
    'Login': '/login',
    'Dashboard': '/dashboard',
    'Users': '/users',
    'Invites': '/invites',
    'Settings': '/settings',
    'Storage': '/storage',
  };

  return pageMap[pageName] || '/dashboard';
}

/**
 * Gets the page name from a URL path
 */
export function getPageNameFromPath(path: string): string {
  const pathMap: Record<string, string> = {
    '/login': 'Login',
    '/dashboard': 'Dashboard',
    '/users': 'Users',
    '/invites': 'Invites',
    '/settings': 'Settings',
    '/storage': 'Storage',
  };

  return pathMap[path] || 'Dashboard';
}

