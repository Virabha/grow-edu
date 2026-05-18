import { apiClient } from "../client";

export interface Category {
  categoryId: string;
  parentCategoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  coursesCount?: number;
  children?: Category[];
}

export const categoriesApi = {
  getAll: () => apiClient.get<Category[]>("/categories").then((r) => r.data),
  getBySlug: (slug: string) =>
    apiClient.get<Category & { coursesCount: number }>(`/categories/slug/${slug}`).then((r) => r.data),
};
