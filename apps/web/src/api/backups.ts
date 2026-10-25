import apiClient from './client';
import type { BackupRecord } from './admin';

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
};
