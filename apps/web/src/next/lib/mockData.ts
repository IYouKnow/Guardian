// Centralized mock data for Guardian. Designed to be swapped for a Go API later.
// Each export mirrors the shape a REST/GraphQL endpoint would return.

export const platformMeta = {
  name: 'Guardian',
  tagline: 'Secure Personal Vault',
  version: 'v4.2.1',
  region: 'eu-west-1',
  status: 'operational',
};

export const users = [
  { id: 'u1', name: 'Elena Vasquez', email: 'elena.v@guardian.io', role: 'admin', status: 'active', plan: 'Enterprise', storage: '184 GB', quota: '1 TB', lastActive: '2 min ago', joined: '2023-04-12', vaults: 14, avatar: 'EV' },
  { id: 'u2', name: 'Marcus Chen', email: 'm.chen@guardian.io', role: 'user', status: 'active', plan: 'Pro', storage: '42 GB', quota: '200 GB', lastActive: '11 min ago', joined: '2023-08-30', vaults: 6, avatar: 'MC' },
  { id: 'u3', name: 'Sofia Andersson', email: 'sofia.a@guardian.io', role: 'user', status: 'active', plan: 'Pro', storage: '78 GB', quota: '200 GB', lastActive: '24 min ago', joined: '2024-01-18', vaults: 9, avatar: 'SA' },
  { id: 'u4', name: 'James Okonkwo', email: 'james.o@guardian.io', role: 'user', status: 'suspended', plan: 'Free', storage: '1.2 GB', quota: '5 GB', lastActive: '3 days ago', joined: '2024-03-22', vaults: 2, avatar: 'JO' },
  { id: 'u5', name: 'Priya Nair', email: 'priya.n@guardian.io', role: 'manager', status: 'active', plan: 'Team', storage: '96 GB', quota: '500 GB', lastActive: '52 min ago', joined: '2023-11-04', vaults: 11, avatar: 'PN' },
  { id: 'u6', name: 'Liam Murphy', email: 'liam.m@guardian.io', role: 'user', status: 'active', plan: 'Pro', storage: '23 GB', quota: '200 GB', lastActive: '1 hr ago', joined: '2024-02-09', vaults: 4, avatar: 'LM' },
  { id: 'u7', name: 'Yuki Tanaka', email: 'yuki.t@guardian.io', role: 'user', status: 'pending', plan: 'Pro', storage: '0 GB', quota: '200 GB', lastActive: '—', joined: '2026-10-15', vaults: 0, avatar: 'YT' },
  { id: 'u8', name: 'Amara Diallo', email: 'amara.d@guardian.io', role: 'manager', status: 'active', plan: 'Team', storage: '142 GB', quota: '500 GB', lastActive: '4 hr ago', joined: '2023-06-21', vaults: 18, avatar: 'AD' },
  { id: 'u9', name: 'Noah Schmidt', email: 'noah.s@guardian.io', role: 'user', status: 'active', plan: 'Free', storage: '3.4 GB', quota: '5 GB', lastActive: '6 hr ago', joined: '2024-05-14', vaults: 3, avatar: 'NS' },
  { id: 'u10', name: 'Isabella Rossi', email: 'isabella.r@guardian.io', role: 'admin', status: 'active', plan: 'Enterprise', storage: '210 GB', quota: '1 TB', lastActive: '12 min ago', joined: '2023-02-28', vaults: 22, avatar: 'IR' },
  { id: 'u11', name: 'Diego Fernandez', email: 'diego.f@guardian.io', role: 'user', status: 'suspended', plan: 'Pro', storage: '67 GB', quota: '200 GB', lastActive: '2 weeks ago', joined: '2023-09-17', vaults: 5, avatar: 'DF' },
  { id: 'u12', name: 'Hannah Kim', email: 'hannah.k@guardian.io', role: 'user', status: 'active', plan: 'Pro', storage: '54 GB', quota: '200 GB', lastActive: '20 min ago', joined: '2024-04-03', vaults: 7, avatar: 'HK' },
];

export const invitations = [
  { id: 'i1', email: 'contractor.acme@guardian.io', role: 'user', plan: 'Pro', sentTo: 'Alex Mercer', status: 'pending', sent: '2026-10-16', expires: '2026-10-23', invitedBy: 'Elena Vasquez' },
  { id: 'i2', email: 'dev-team@acme.io', role: 'manager', plan: 'Team', sentTo: 'Riley Park', status: 'pending', sent: '2026-10-14', expires: '2026-10-21', invitedBy: 'Priya Nair' },
  { id: 'i3', email: 'finance@guardian.io', role: 'admin', plan: 'Enterprise', sentTo: 'Casey Brooks', status: 'accepted', sent: '2026-10-10', expires: '2026-10-17', invitedBy: 'Isabella Rossi' },
  { id: 'i4', email: 'intern.su@guardian.io', role: 'user', plan: 'Free', sentTo: 'Su Lin', status: 'expired', sent: '2026-09-28', expires: '2026-10-05', invitedBy: 'Amara Diallo' },
  { id: 'i5', email: 'qa-lead@guardian.io', role: 'manager', plan: 'Team', sentTo: 'Jordan Hale', status: 'pending', sent: '2026-10-15', expires: '2026-10-22', invitedBy: 'Marcus Chen' },
  { id: 'i6', email: 'ops.external@acme.io', role: 'user', plan: 'Pro', sentTo: 'Sam Rivera', status: 'revoked', sent: '2026-10-02', expires: '2026-10-09', invitedBy: 'Elena Vasquez' },
  { id: 'i7', email: 'design@guardian.io', role: 'user', plan: 'Pro', sentTo: 'Mia Castell', status: 'accepted', sent: '2026-10-08', expires: '2026-10-15', invitedBy: 'Sofia Andersson' },
];

export const storageOverview = {
  totalAllocated: 1200, // TB
  totalUsed: 847, // TB
  byType: [
    { name: 'Documents', value: 312, color: 'var(--chart-1)' },
    { name: 'Media', value: 268, color: 'var(--chart-2)' },
    { name: 'Backups', value: 184, color: 'var(--chart-3)' },
    { name: 'Archives', value: 56, color: 'var(--chart-4)' },
    { name: 'Other', value: 27, color: 'var(--chart-5)' },
  ],
  growth: [
    { month: 'May', used: 612 },
    { month: 'Jun', used: 658 },
    { month: 'Jul', used: 701 },
    { month: 'Aug', used: 742 },
    { month: 'Sep', used: 803 },
    { month: 'Oct', used: 847 },
  ],
};

export const perUserQuotas = [
  { id: 'q1', name: 'Elena Vasquez', plan: 'Enterprise', used: 184, quota: 1024, pct: 18 },
  { id: 'q2', name: 'Isabella Rossi', plan: 'Enterprise', used: 210, quota: 1024, pct: 21 },
  { id: 'q3', name: 'Amara Diallo', plan: 'Team', used: 142, quota: 500, pct: 28 },
  { id: 'q4', name: 'Priya Nair', plan: 'Team', used: 96, quota: 500, pct: 19 },
  { id: 'q5', name: 'Sofia Andersson', plan: 'Pro', used: 78, quota: 200, pct: 39 },
  { id: 'q6', name: 'Marcus Chen', plan: 'Pro', used: 42, quota: 200, pct: 21 },
  { id: 'q7', name: 'Diego Fernandez', plan: 'Pro', used: 67, quota: 200, pct: 34 },
  { id: 'q8', name: 'Hannah Kim', plan: 'Pro', used: 54, quota: 200, pct: 27 },
  { id: 'q9', name: 'Noah Schmidt', plan: 'Free', used: 3.4, quota: 5, pct: 68 },
  { id: 'q10', name: 'James Okonkwo', plan: 'Free', used: 1.2, quota: 5, pct: 24 },
];

export const currentAdmin = {
  name: 'Elena Vasquez',
  email: 'elena.v@guardian.io',
  role: 'Platform Administrator',
  avatar: 'EV',
  joined: 'April 2023',
  lastLogin: '2 min ago · 203.0.113.42',
};

// Canonical console paths. The sidebar groups them into a Personal section
// (every account's own area) and an Admin section (platform management, admins
// only). Backups appears in both when applicable: the Personal entry is the
// account's own vault, the Admin entry is the full history across all users.
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
}

export interface NavSection {
  id: 'personal' | 'admin';
  label: string;
  items: NavItem[];
}

const personalBackupsItem: NavItem = { id: 'backups', label: 'Backups', path: '/backups', icon: 'Archive' };
const adminBackupsItem: NavItem = { id: 'admin-backups', label: 'Backups', path: '/admin/backups', icon: 'Archive' };
const accountItem: NavItem = { id: 'account', label: 'Account', path: '/account', icon: 'UserCircle' };

const adminItems: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/admin', icon: 'LayoutDashboard' },
  { id: 'users', label: 'Users', path: '/admin/users', icon: 'Users' },
  { id: 'invitations', label: 'Invitations', path: '/admin/invitations', icon: 'Mail' },
  { id: 'storage', label: 'Storage', path: '/admin/storage', icon: 'Database' },
  adminBackupsItem,
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: 'Settings' },
];

// Flat list of every console path, for lookups such as the TopBar breadcrumb.
export const navItems: NavItem[] = [...adminItems, personalBackupsItem, accountItem];

// navSectionsFor resolves the sidebar groups for a session. Personal holds the
// account's own items — Backups (when user backups are enabled) and Account — and
// the Admin section is added for admins.
export function navSectionsFor(isAdmin: boolean, canBackup: boolean): NavSection[] {
  const personal: NavItem[] = [];
  if (canBackup) personal.push(personalBackupsItem);
  personal.push(accountItem);

  const sections: NavSection[] = [{ id: 'personal', label: 'Personal', items: personal }];
  if (isAdmin) sections.push({ id: 'admin', label: 'Admin', items: adminItems });
  return sections;
}