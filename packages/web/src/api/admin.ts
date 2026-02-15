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

export interface AdminUser {
    id: number;
    username: string;
    is_admin: boolean;
    friendly_name: string;
    status: string;
    role: string;
    vault_items: number;
    created_at: string;
    last_login: string | null;
    used_space?: string;
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
