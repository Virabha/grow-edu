import { User, UsersResponse, UpdateUserDto, UserFilters } from '../types';
import { parseJsonResponse, parseErrorResponse } from '@/lib/types/api';
import { env } from '@/lib/env';
const API_URL = env.NEXT_PUBLIC_API_URL;
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};
export const usersApi = {
    async getAll(filters?: UserFilters & {
        companyId?: string;
    }): Promise<UsersResponse> {
        const params = new URLSearchParams();
        if (filters?.role)
            params.append('role', filters.role);
        if (filters?.search)
            params.append('search', filters.search);
        if (filters?.companyId)
            params.append('companyId', filters.companyId);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await fetch(`${API_URL}/users?${params.toString()}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch users');
        }
        return parseJsonResponse<UsersResponse>(response);
    },
    async getById(id: string): Promise<User> {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch user');
        }
        return parseJsonResponse<User>(response);
    },
    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to update user');
        }
        return parseJsonResponse<User>(response);
    },
    async delete(id: string): Promise<{
        message: string;
    }> {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to delete user');
        }
        return parseJsonResponse<{
            message: string;
        }>(response);
    },
};
