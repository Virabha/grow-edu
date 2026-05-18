import { LoginDto, RegisterDto, LoginResponse, RegisterResponse, ForgotPasswordDto, ResetPasswordDto } from '../types';
import { parseJsonResponse, parseErrorResponse } from '@/lib/types/api';

import { env } from '@/lib/env';

function getAuthBaseUrl(): string {
    if (typeof window !== 'undefined') return '/api';
    return env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
}

export const authApi = {
    async login(dto: LoginDto): Promise<LoginResponse> {
        const response = await fetch(`${getAuthBaseUrl()}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Login failed');
        }
        return parseJsonResponse<LoginResponse>(response);
    },
    async register(dto: RegisterDto): Promise<RegisterResponse> {
        const response = await fetch(`${getAuthBaseUrl()}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Registration failed');
        }
        return parseJsonResponse<RegisterResponse>(response);
    },
    async forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }> {
        const response = await fetch(`${getAuthBaseUrl()}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to send reset email');
        }
        return parseJsonResponse<{
            message: string;
        }>(response);
    },
    async resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }> {
        const response = await fetch(`${getAuthBaseUrl()}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Password reset failed');
        }
        return parseJsonResponse<{
            message: string;
        }>(response);
    },
    async verifyEmail(token: string): Promise<{
        message: string;
    }> {
        const response = await fetch(`${getAuthBaseUrl()}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Email verification failed');
        }
        return parseJsonResponse<{
            message: string;
        }>(response);
    },
};
