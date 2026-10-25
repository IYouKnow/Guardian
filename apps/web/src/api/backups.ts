import apiClient from './client';
import type { BackupRecord } from './admin';

// The per-user remote destination. Each account links its own Google Drive, so a
// snapshot only ever leaves the host for the account that owns it.
export interface BackupDestination {
    provider: string;
    connected: boolean;
    enabled: boolean;
    account_email: string;
    folder_name: string;
    folder_id: string;
    connected_at: string | null;
    last_sync: string | null;
    last_error: string;
    encrypted: boolean;
    client_configured: boolean;
}

export interface BackupDestinationSettings {
    backup_key?: string;
    folder_name?: string;
}

// Per-user backup endpoints. These only ever expose the caller's own vault
// snapshots and are available when the operator enables user backups.
export const userBackupApi = {
    async list(limit = 50): Promise<BackupRecord[]> {
        const response = await apiClient.get<BackupRecord[]>('/api/backups', { params: { limit } });
        return response.data;
    },

    async create(): Promise<BackupRecord> {
        const response = await apiClient.post<BackupRecord>('/api/backups');
        return response.data;
    },

    async remove(id: number): Promise<void> {
        await apiClient.delete(`/api/backups/${id}`);
    },

    async download(id: number): Promise<Blob> {
        // No client-side timeout: the archive can take longer than the default 10s.
        const response = await apiClient.get<Blob>(`/api/backups/${id}/download`, {
            responseType: 'blob',
            timeout: 0,
        });
        return response.data;
    },

    async getDestination(): Promise<BackupDestination> {
        const response = await apiClient.get<BackupDestination>('/api/backups/destination');
        return response.data;
    },

    async setDestination(enabled: boolean): Promise<BackupDestination> {
        const response = await apiClient.put<BackupDestination>('/api/backups/destination', { enabled });
        return response.data;
    },

    async startGoogleOAuth(settings: BackupDestinationSettings = {}): Promise<{ auth_url: string }> {
        const response = await apiClient.post<{ auth_url: string }>('/api/backups/destination/connect', settings);
        return response.data;
    },

    async disconnectDestination(): Promise<void> {
        await apiClient.delete('/api/backups/destination');
    },
};
