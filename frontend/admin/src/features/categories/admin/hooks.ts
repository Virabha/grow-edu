"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminCategoriesApi } from "./api";
import type { CategoryFilters, CreateCategoryDto, UpdateCategoryDto } from "./types";
import { getApiError } from "@/lib/api/errors";
export const adminCategoryKeys = {
    all: ["admin-categories"] as const,
    list: (filters?: CategoryFilters) => [...adminCategoryKeys.all, "list", filters] as const,
    detail: (id: string) => [...adminCategoryKeys.all, "detail", id] as const,
};
export function useAdminCategories(filters?: CategoryFilters) {
    return useQuery({
        queryKey: adminCategoryKeys.list(filters),
        queryFn: () => adminCategoriesApi.getAll(filters),
    });
}
export function useCreateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateCategoryDto) => adminCategoriesApi.create(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: adminCategoryKeys.all });
            toast.success("Category created");
        },
        onError: (e: unknown) => {
            toast.error(getApiError(e, "Failed to create category").message);
        },
    });
}
export function useUpdateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ categoryId, dto }: {
            categoryId: string;
            dto: UpdateCategoryDto;
        }) => adminCategoriesApi.update(categoryId, dto),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: adminCategoryKeys.all });
            qc.setQueryData(adminCategoryKeys.detail(data.categoryId), data);
            toast.success("Category updated");
        },
        onError: (e: unknown) => {
            toast.error(getApiError(e, "Failed to update category").message);
        },
    });
}
export function useToggleCategoryStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ categoryId, activate }: {
            categoryId: string;
            activate: boolean;
        }) => activate ? adminCategoriesApi.activate(categoryId) : adminCategoriesApi.deactivate(categoryId),
        onSuccess: (_, { activate }) => {
            qc.invalidateQueries({ queryKey: adminCategoryKeys.all });
            toast.success(`Category ${activate ? "activated" : "deactivated"}`);
        },
        onError: (e: unknown) => {
            toast.error(getApiError(e, "Failed to update category status").message);
        },
    });
}
export function useDeleteCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (categoryId: string) => adminCategoriesApi.delete(categoryId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: adminCategoryKeys.all });
            toast.success("Category deleted");
        },
        onError: (e: unknown) => {
            toast.error(getApiError(e, "Failed to delete category").message);
        },
    });
}
