import { apiClient } from "@/lib/api/client";
import type { AdminCategory, AdminCategoriesResponse, CategoryFilters, CreateCategoryDto, UpdateCategoryDto, } from "./types";
export const adminCategoriesApi = {
    getAll: async (filters?: CategoryFilters): Promise<AdminCategoriesResponse> => {
        const params = new URLSearchParams();
        if (filters?.search)
            params.set("search", filters.search);
        if (filters?.isActive !== undefined)
            params.set("isActive", String(filters.isActive));
        if (filters?.parentCategoryId)
            params.set("parentCategoryId", filters.parentCategoryId);
        if (filters?.page)
            params.set("page", String(filters.page));
        if (filters?.limit)
            params.set("limit", String(filters.limit));
        const qs = params.toString();
        const url = qs ? `/admin/categories?${qs}` : "/admin/categories";
        const { data } = await apiClient.get<AdminCategoriesResponse>(url);
        return data;
    },
    getById: async (categoryId: string): Promise<AdminCategory> => {
        const { data } = await apiClient.get<AdminCategory>(`/admin/categories/${categoryId}`);
        return data;
    },
    create: async (dto: CreateCategoryDto): Promise<AdminCategory> => {
        const { data } = await apiClient.post<AdminCategory>("/admin/categories", dto);
        return data;
    },
    update: async (categoryId: string, dto: UpdateCategoryDto): Promise<AdminCategory> => {
        const { data } = await apiClient.put<AdminCategory>(`/admin/categories/${categoryId}`, dto);
        return data;
    },
    activate: async (categoryId: string): Promise<{
        categoryId: string;
        isActive: boolean;
    }> => {
        const { data } = await apiClient.patch<{
            categoryId: string;
            isActive: boolean;
        }>(`/admin/categories/${categoryId}/activate`);
        return data;
    },
    deactivate: async (categoryId: string): Promise<{
        categoryId: string;
        isActive: boolean;
    }> => {
        const { data } = await apiClient.patch<{
            categoryId: string;
            isActive: boolean;
        }>(`/admin/categories/${categoryId}/deactivate`);
        return data;
    },
    delete: async (categoryId: string): Promise<{
        categoryId: string;
        isDeleted: boolean;
    }> => {
        const { data } = await apiClient.delete<{
            categoryId: string;
            isDeleted: boolean;
        }>(`/admin/categories/${categoryId}`);
        return data;
    },
};
