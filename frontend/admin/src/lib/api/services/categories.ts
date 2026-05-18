import { apiClient } from "../client";
export interface Category {
    categoryId: string;
    parentCategoryId?: string | null;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string | null;
    children?: Category[];
}
export const categoriesApi = {
    getAll: async (): Promise<Category[]> => {
        const { data } = await apiClient.get("/categories");
        return data;
    },
    getById: async (id: string): Promise<Category> => {
        const { data } = await apiClient.get(`/categories/${id}`);
        return data;
    },
    getBySlug: async (slug: string): Promise<Category> => {
        const { data } = await apiClient.get(`/categories/slug/${slug}`);
        return data;
    },
};
