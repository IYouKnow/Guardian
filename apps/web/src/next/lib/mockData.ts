// Centralized mock data for Guardian. Designed to be swapped for a Go API later.
// Each export mirrors the shape a REST/GraphQL endpoint would return.

export const platformMeta = {
  name: 'Guardian',
  tagline: 'Secure Personal Vault',
  version: 'v4.2.1',
  region: 'eu-west-1',
  status: 'operational',
};

// Placeholder card: there is no backups endpoint yet, so this value is not real.
export const backupsMetric = {
  id: 'backups',
  label: 'Backups Today',
  value: '1,204',
  delta: '+8.1%',
  trend: 'up',
  sub: '3 failed · retrying',
  icon: 'archive',
};

export const activitySeries = [
  { day: 'Mon', uploads: 4200, downloads: 2800, backups: 1800 },
  { day: 'Tue', uploads: 3800, downloads: 3100, backups: 2100 },
  { day: 'Wed', uploads: 5100, downloads: 3400, backups: 1900 },
  { day: 'Thu', uploads: 4600, downloads: 3900, backups: 2400 },
  { day: 'Fri', uploads: 6200, downloads: 4200, backups: 2200 },
  { day: 'Sat', uploads: 3400, downloads: 2600, backups: 1500 },
  { day: 'Sun', uploads: 2900, downloads: 2300, backups: 1700 },
];

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

export const backupProviders = [
  { id: 'p1', name: 'AWS S3 Glacier', type: 'Cold Storage', status: 'connected', region: 'eu-west-1', lastSync: '8 min ago', backups: 4827, health: 99, icon: 'cloud' },
  { id: 'p2', name: 'Google Cloud Storage', type: 'Nearline', status: 'connected', region: 'us-east-1', lastSync: '14 min ago', backups: 3120, health: 98, icon: 'cloud' },
  { id: 'p3', name: 'Backblaze B2', type: 'Hot Storage', status: 'connected', region: 'eu-central-1', lastSync: '3 min ago', backups: 1844, health: 100, icon: 'database' },
  { id: 'p4', name: 'Azure Blob Archive', type: 'Cold Storage', status: 'degraded', region: 'eu-west-1', lastSync: '2 hr ago', backups: 968, health: 71, icon: 'cloud' },
  { id: 'p5', name: 'Local NAS', type: 'On-Premise', status: 'disconnected', region: '—', lastSync: '3 days ago', backups: 0, health: 0, icon: 'server' },
];

export const backupHistory = [
  { id: 'b1', vault: 'elena.v/personal', provider: 'AWS S3 Glacier', size: '6.2 GB', status: 'success', duration: '2m 14s', time: '8 min ago' },
  { id: 'b2', vault: 'marcus.c/work', provider: 'Backblaze B2', size: '1.8 GB', status: 'success', duration: '47s', time: '14 min ago' },
  { id: 'b3', vault: 'sofia.a/media', provider: 'Google Cloud Storage', size: '24 GB', status: 'success', duration: '8m 02s', time: '23 min ago' },
  { id: 'b4', vault: 'priya.n/projects', provider: 'AWS S3 Glacier', size: '12 GB', status: 'failed', duration: '—', time: '31 min ago' },
  { id: 'b5', vault: 'liam.m/archive', provider: 'Azure Blob Archive', size: '880 MB', status: 'partial', duration: '3m 41s', time: '46 min ago' },
  { id: 'b6', vault: 'amara.d/shared', provider: 'Backblaze B2', size: '4.4 GB', status: 'success', duration: '1m 58s', time: '1 hr ago' },
  { id: 'b7', vault: 'isabella.r/finance', provider: 'AWS S3 Glacier', size: '18 GB', status: 'success', duration: '6m 12s', time: '1 hr ago' },
];

export const backupSchedules = [
  { id: 'sch1', name: 'Nightly Personal Vaults', cron: '0 2 * * *', targets: 'All personal vaults', provider: 'AWS S3 Glacier', retention: '30 days', enabled: true },
  { id: 'sch2', name: 'Weekly Team Archives', cron: '0 3 * * 0', targets: 'Team workspaces', provider: 'Google Cloud Storage', retention: '90 days', enabled: true },
  { id: 'sch3', name: 'Hourly Hot Backups', cron: '0 * * * *', targets: 'Critical vaults', provider: 'Backblaze B2', retention: '7 days', enabled: true },
  { id: 'sch4', name: 'Monthly Cold Archive', cron: '0 4 1 * *', targets: 'All vaults', provider: 'Azure Blob Archive', retention: '365 days', enabled: false },
];

export const currentAdmin = {
  name: 'Elena Vasquez',
  email: 'elena.v@guardian.io',
  role: 'Platform Administrator',
  avatar: 'EV',
  joined: 'April 2023',
  lastLogin: '2 min ago · 203.0.113.42',
};

// Canonical console paths. `adminOnly` items are hidden from non-admin sessions
// and their routes are gated by RequireAdmin.
export const navItems = [
  { id: 'overview', label: 'Overview', path: '/', icon: 'LayoutDashboard', adminOnly: true },
  { id: 'users', label: 'Users', path: '/users', icon: 'Users', adminOnly: true },
  { id: 'invitations', label: 'Invitations', path: '/invitations', icon: 'Mail', adminOnly: true },
  { id: 'storage', label: 'Storage', path: '/storage', icon: 'Database', adminOnly: true },
  { id: 'backups', label: 'Backups', path: '/backups', icon: 'Archive', adminOnly: true },
  { id: 'settings', label: 'Settings', path: '/settings', icon: 'Settings', adminOnly: true },
  { id: 'account', label: 'Account', path: '/account', icon: 'UserCircle', adminOnly: false },
];