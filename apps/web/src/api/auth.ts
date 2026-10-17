import apiClient from './client';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    username: string;
    is_admin: boolean;
}

export interface MeResponse {
    id: number;
    username: string;
    is_admin: boolean;
}

export const authApi = {
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

        // Store token and user info
        localStorage.setItem('guardian_token', response.data.token);
        localStorage.setItem('guardian_user', JSON.stringify({
            username: response.data.username,
            is_admin: response.data.is_admin,
        }));

        return response.data;
    },

    // Validates the stored token with the server and refreshes cached user info.
    // Throws on 401 (expired/revoked token, or the account no longer exists).
    async me(): Promise<MeResponse> {
        const response = await apiClient.get<MeResponse>('/auth/me');
        localStorage.setItem('guardian_user', JSON.stringify({
            username: response.data.username,
            is_admin: response.data.is_admin,
        }));
        return response.data;
    },

    logout() {
        localStorage.removeItem('guardian_token');
        localStorage.removeItem('guardian_user');
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

    getToken(): string | null {
        return localStorage.getItem('guardian_token');
    },
};
