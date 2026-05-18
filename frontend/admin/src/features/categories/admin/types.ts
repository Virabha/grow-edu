export interface AdminCategory {
    categoryId: string;
    parentCategoryId?: string | null;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    coursesCount?: number;
}
export interface AdminCategoriesResponse {
    data: AdminCategory[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface CategoryFilters {
    search?: string;
    isActive?: boolean;
    parentCategoryId?: string;
    page?: number;
    limit?: number;
}
export interface CreateCategoryDto {
    name: string;
    slug?: string;
    description?: string;
    isActive?: boolean;
    displayOrder?: number;
    parentCategoryId?: string | null;
    imageUrl?: string;
}
export interface UpdateCategoryDto {
    name?: string;
    slug?: string;
    description?: string | null;
    isActive?: boolean;
    displayOrder?: number;
    parentCategoryId?: string | null;
    imageUrl?: string;
}
