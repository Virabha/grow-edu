"use client";
import { useCategories as useAllCategories, useCategory as useSingleCategory, useCategoryBySlug as useCategorySlug } from "@/lib/hooks/use-data";
interface UseCategoriesParams {
    enabled?: boolean;
}
export function useCategories({ enabled }: UseCategoriesParams = {}) {
    return useAllCategories({ enabled });
}
interface UseCategoryParams {
    enabled?: boolean;
    categoryId?: string;
}
export function useCategory({ enabled, categoryId }: UseCategoryParams = {}) {
    return useSingleCategory({ enabled, id: categoryId });
}
interface UseCategoryBySlugParams {
    enabled?: boolean;
    slug?: string;
}
export function useCategoryBySlug({ enabled, slug }: UseCategoryBySlugParams = {}) {
    return useCategorySlug({ enabled, slug });
}
