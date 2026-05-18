import { apiClient } from '../client';
export interface LoginDto {
    email: string;
    password: string;
}
export interface RegisterDto {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}
export interface AuthResponse {
    access_token: string;
    user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        role: string;
    };
}
export const authApi = {
    login: async (dto: LoginDto): Promise<AuthResponse> => {
        const { data } = await apiClient.post('/auth/login', dto);
        return data;
    },
    register: async (dto: RegisterDto): Promise<AuthResponse> => {
        const { data } = await apiClient.post('/auth/register', dto);
        return data;
    },
    forgotPassword: async (email: string) => {
        const { data } = await apiClient.post('/auth/forgot-password', { email });
        return data;
    },
    resetPassword: async (token: string, newPassword: string) => {
        const { data } = await apiClient.post('/auth/reset-password', { token, newPassword });
        return data;
    },
    verifyEmail: async (token: string) => {
        const { data } = await apiClient.post('/auth/verify-email', { token });
        return data;
    },
    getProfile: async () => {
        const { data } = await apiClient.get('/auth/profile');
        return data;
    },
};
