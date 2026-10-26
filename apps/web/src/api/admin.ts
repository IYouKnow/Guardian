import apiClient from './client';

export interface Invite {
    id: number;
    token: string;
    created_at: string;
    expires_at: string | null;
    expires_in: string;
    used_at: string | null;
    use_count: number;
    max_uses: number;
    created_by: number;
    note: string;
    status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
    used_by: string;
}

export interface HealthResponse {
    status: string;
    version: string;
}

export interface UserStats {
    total_users: number;
    total_invites: number;
    active_sessions: number;
}

export interface PlatformInfo {
    version: string;
    status: string;
    uptime_seconds: number;
    environment: string;
    go_version: string;
    os: string;
    arch: string;
    database_size: string;
    users: number;
}

export interface ActivityEntry {
    id: number;
    actor: string;
    action: string;
    target: string;
    category: string;
    created_at: string;
}

export interface TrafficPoint {
    day: string;
    uploads: number;
    downloads: number;
    signins: number;
}

export interface StorageBreakdownItem {
    name: string;
    bytes: number;
}

export interface StorageUser {
    id: number;
    username: string;
    friendly_name: string;
    role: string;
    status: string;
    db_bytes: number;
    overhead_bytes: number;
    total_bytes: number;
}

export interface StorageGrowthPoint {
    month: string;
    bytes: number;
}

export interface StorageOverview {
    total_used: number;
    allocation_bytes: number;
    capacity_source: 'allocation' | 'disk';
    disk_total: number;
    disk_free: number;
    breakdown: StorageBreakdownItem[];
    users: StorageUser[];
    growth: StorageGrowthPoint[];
}

export interface BackupRecord {
    id: number;
    filename: string;
    size: number;
    vaults: number;
    status: 'success' | 'failed';
    trigger: 'manual' | 'schedule';
    schedule_id: number | null;
    duration_ms: number;
    error: string;
    remote_status: '' | 'pending' | 'uploaded' | 'failed';
    remote_error: string;
    owner: string;
    created_at: string;
}

export interface BackupIntegration {
    client_id: string;
    client_secret_configured: boolean;
    public_url: string;
    // The exact value to register as an authorized redirect URI on the Google
    // Web-application client; derived the same way the OAuth flow uses it.
    redirect_uri: string;
}

export interface BackupSchedule {
    id: number;
    name: string;
    interval_minutes: number;
    retention_days: number;
    enabled: boolean;
    last_run: string | null;
    next_run: string | null;
    created_at: string;
}

export interface CreateScheduleRequest {
    name: string;
    interval_minutes: number;
    retention_days: number;
    enabled?: boolean;
}

export interface AdminUser {
    id: number;
    username: string;
    is_admin: boolean;
    friendly_name: string;
    status: string;
    role: string;
    vault_items: number;
    max_ws_per_ip: number;
    created_at: string;
    last_login: string | null;
    used_space?: string;
    used_space_overhead?: string;
}

export interface UpdateUserRequest {
    max_ws_per_ip?: number;
    status?: string;
    role?: string;
}

export interface CreateInviteRequest {
    max_uses: number;
    expires_in: string;
    note: string;
}

export const adminApi = {
    async getInvites(): Promise<Invite[]> {
        const response = await apiClient.get<Invite[]>('/api/admin/invites');
        return response.data;
    },

    async generateInvite(data: CreateInviteRequest): Promise<Invite> {
        const response = await apiClient.post<Invite>('/api/admin/invites', data);
        return response.data;
    },

    async deleteInvite(id: number): Promise<void> {
        await apiClient.delete(`/api/admin/invites/${id}`);
    },

    async getHealth(): Promise<HealthResponse> {
        const response = await apiClient.get<HealthResponse>('/health');
        return response.data;
    },

    async getUsers(): Promise<AdminUser[]> {
        const response = await apiClient.get<AdminUser[]>('/api/admin/users');
        return response.data;
    },

    async updateUser(id: number, data: UpdateUserRequest): Promise<void> {
        await apiClient.put(`/api/admin/users/${id}`, data);
    },

    async getSettings(): Promise<Record<string, string>> {
        const response = await apiClient.get<Record<string, string>>('/api/admin/settings');
        return response.data;
    },

    async updateSetting(key: string, value: string): Promise<void> {
        await apiClient.put('/api/admin/settings', { key, value });
    },

    async getPlatformInfo(): Promise<PlatformInfo> {
        const response = await apiClient.get<PlatformInfo>('/api/admin/platform');
        return response.data;
    },

    async getActivity(limit = 20): Promise<ActivityEntry[]> {
        const response = await apiClient.get<ActivityEntry[]>('/api/admin/activity', { params: { limit } });
        return response.data;
    },

    async getTraffic(days = 7): Promise<TrafficPoint[]> {
        const response = await apiClient.get<TrafficPoint[]>('/api/admin/traffic', { params: { days } });
        return response.data;
    },

    async getStorage(): Promise<StorageOverview> {
        const response = await apiClient.get<StorageOverview>('/api/admin/storage');
        return response.data;
    },

    async getBackups(limit = 50): Promise<BackupRecord[]> {
        const response = await apiClient.get<BackupRecord[]>('/api/admin/backups', { params: { limit } });
        return response.data;
    },

    async createBackup(): Promise<BackupRecord> {
        const response = await apiClient.post<BackupRecord>('/api/admin/backups');
        return response.data;
    },

    async deleteBackup(id: number): Promise<void> {
        await apiClient.delete(`/api/admin/backups/${id}`);
    },

    async downloadBackup(id: number): Promise<Blob> {
        // No client-side timeout: a full-server archive can take longer than the
        // default 10s to stream.
        const response = await apiClient.get<Blob>(`/api/admin/backups/${id}/download`, {
            responseType: 'blob',
            timeout: 0,
        });
        return response.data;
    },

    async getSchedules(): Promise<BackupSchedule[]> {
        const response = await apiClient.get<BackupSchedule[]>('/api/admin/backup-schedules');
        return response.data;
    },

    async createSchedule(data: CreateScheduleRequest): Promise<BackupSchedule> {
        const response = await apiClient.post<BackupSchedule>('/api/admin/backup-schedules', data);
        return response.data;
    },

    async updateSchedule(id: number, data: Partial<CreateScheduleRequest>): Promise<BackupSchedule> {
        const response = await apiClient.put<BackupSchedule>(`/api/admin/backup-schedules/${id}`, data);
        return response.data;
    },

    async deleteSchedule(id: number): Promise<void> {
        await apiClient.delete(`/api/admin/backup-schedules/${id}`);
    },

    async getBackupIntegration(): Promise<BackupIntegration> {
        const response = await apiClient.get<BackupIntegration>('/api/admin/backup-destination/integration');
        return response.data;
    },

    async updateBackupIntegration(data: { client_id: string; client_secret?: string; public_url?: string }): Promise<BackupIntegration> {
        const response = await apiClient.put<BackupIntegration>('/api/admin/backup-destination/integration', data);
        return response.data;
    },

    // Mock endpoints - to be implemented later
    async getUserStats(): Promise<UserStats> {
        // TODO: Implement on server
        return {
            total_users: 12,
            total_invites: 5,
            active_sessions: 3,
        };
    },

    async getSystemLogs(): Promise<string[]> {
        // TODO: Implement on server
        return [
            '[2025-12-30 00:00:00] Server started',
            '[2025-12-30 00:15:23] User admin logged in',
            '[2025-12-30 00:30:45] Invite token generated',
        ];
    },
};
