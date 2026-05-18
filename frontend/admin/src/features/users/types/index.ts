import type { User } from '../../auth/types';
export type { User };
export interface UserWithDates extends User {
    createdAt: string;
    updatedAt?: string;
}
export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    role?: 'LEARNER' | 'INSTRUCTOR' | 'CORPORATE_ADMIN' | 'PLATFORM_ADMIN';
    emailVerified?: boolean;
}
export interface UsersResponse {
    data: UserWithDates[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages?: number;
    };
}
export type UserFilters = {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
};
