import apiClient from './client';

export interface InviteTokenResponse {
    token: string;
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

export const adminApi = {
    async generateInvite(): Promise<InviteTokenResponse> {
        const response = await apiClient.post<InviteTokenResponse>('/api/admin/invites');
        return response.data;
    },

    async getHealth(): Promise<HealthResponse> {
        const response = await apiClient.get<HealthResponse>('/health');
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
