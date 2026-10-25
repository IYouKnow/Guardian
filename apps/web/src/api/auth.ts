import apiClient from './client';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    username: string;
    is_admin: boolean;
    can_backup: boolean;
    backups_enabled: boolean;
}

export interface MeResponse {
    id: number;
    username: string;
    is_admin: boolean;
    can_backup: boolean;
    backups_enabled: boolean;
}

export interface RegisterRequest {
    username: string;
    password: string;
    invite_token: string;
    db_name?: string;
}

export interface SetupStatusResponse {
    status: 'SETUP' | 'READY';
}

// --- Session-user reactivity ---
// The console reads the cached session user synchronously (sidebar gating, route
// guards). Components subscribe to this so a change made elsewhere — such as the
// operator toggling backups in Settings — is reflected without a reload.
const userListeners = new Set<() => void>();

export function subscribeUser(listener: () => void): () => void {
    userListeners.add(listener);
    return () => { userListeners.delete(listener); };
}

export function getUserSnapshot(): string {
    return localStorage.getItem('guardian_user') ?? '';
}

function emitUserChange(): void {
    for (const listener of userListeners) listener();
}

export const authApi = {
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

        // Store token and user info
        localStorage.setItem('guardian_token', response.data.token);
        localStorage.setItem('guardian_user', JSON.stringify({
            username: response.data.username,
            is_admin: response.data.is_admin,
            can_backup: response.data.can_backup,
            backups_enabled: response.data.backups_enabled,
        }));
        emitUserChange();

        return response.data;
    },

    // Reports whether the server still needs its first admin (SETUP) or is
    // accepting invite-based registrations (READY). Public endpoint.
    async setupStatus(): Promise<SetupStatusResponse> {
        const response = await apiClient.get<SetupStatusResponse>('/auth/setup-status');
        return response.data;
    },

    // Creates an account with an invite token (or the setup code for the first
    // admin). The server responds 201 and issues no token, so nothing is
    // persisted here — the user signs in afterwards.
    async register(payload: RegisterRequest): Promise<void> {
        await apiClient.post('/auth/register', payload);
    },

    // Optional pre-check so the form can surface a friendlier error before submit.
    async validateInvite(token: string): Promise<void> {
        await apiClient.post('/auth/validate-invite', { token });
    },

    // Validates the stored token with the server and refreshes cached user info.
    // Throws on 401 (expired/revoked token, or the account no longer exists).
    async me(): Promise<MeResponse> {
        const response = await apiClient.get<MeResponse>('/auth/me');
        localStorage.setItem('guardian_user', JSON.stringify({
            username: response.data.username,
            is_admin: response.data.is_admin,
            can_backup: response.data.can_backup,
            backups_enabled: response.data.backups_enabled,
        }));
        emitUserChange();
        return response.data;
    },

    logout() {
        localStorage.removeItem('guardian_token');
        localStorage.removeItem('guardian_user');
        emitUserChange();
    },

    getStoredUser() {
        const userStr = localStorage.getItem('guardian_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated(): boolean {
        return !!localStorage.getItem('guardian_token');
    },

    isAdmin(): boolean {
        const user = this.getStoredUser();
        return user?.is_admin || false;
    },

    // Whether the operator enabled user backups (the personal, own-vault view).
    // This is the same for every account, admins included; admin access to the
    // server-wide view comes from isAdmin().
    canBackup(): boolean {
        const user = this.getStoredUser();
        return !!user?.can_backup;
    },

    // The master switch for the whole backups feature. While it is off the
    // server refuses snapshots and the pages show a "not configured" state.
    backupsEnabled(): boolean {
        const user = this.getStoredUser();
        return !!user?.backups_enabled;
    },

    getToken(): string | null {
        return localStorage.getItem('guardian_token');
    },
};
