import { apiClient } from '../client';
export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    profileImage?: string | null;
    emailVerified: boolean;
    companyId?: string;
}
export interface UsersResponse {
    data: User[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImage?: string | null;
}
export interface UserFilters {
    search?: string;
    role?: string;
    page?: number;
    limit?: number;
}
export const usersApi = {
    getAll: async (filters?: UserFilters): Promise<UsersResponse> => {
        const params = new URLSearchParams();
        if (filters?.search)
            params.set('search', filters.search);
        if (filters?.role)
            params.set('role', filters.role);
        if (filters?.page)
            params.set('page', String(filters.page));
        if (filters?.limit)
            params.set('limit', String(filters.limit));
        const { data } = await apiClient.get(`/users?${params.toString()}`);
        return data;
    },
    getById: async (id: string): Promise<User> => {
        const { data } = await apiClient.get(`/users/${id}`);
        return data;
    },
    update: async (id: string, dto: UpdateUserDto): Promise<User> => {
        const { data } = await apiClient.put(`/users/${id}`, dto);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await apiClient.delete(`/users/${id}`);
        return data;
    },
};
