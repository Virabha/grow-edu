import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { axiosGet, axiosPost, axiosPut, axiosDelete } from '../api/client';
import { Category } from '../api/services/categories';
import { CourseProgress, UpdateProgressDto } from '../api/services/progress';
import { CartItem, AddToCartDto } from '../api/services/cart';
import { Enrollment, CreateEnrollmentDto } from '../api/services/enrollments';
import { storageApi } from '../api/services/storage';
interface UseCategoriesParams {
    enabled?: boolean;
}
export function useCategories({ enabled }: UseCategoriesParams = {}) {
    const fetchCategories = async (): Promise<Category[]> => {
        const res = await axiosGet<Category[]>("categories");
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchCategories,
        enabled: enabled !== false,
        queryKey: queryKeys.categories.list(),
    });
}
interface UseCategoryParams {
    enabled?: boolean;
    id?: string;
}
export function useCategory({ enabled, id }: UseCategoryParams = {}) {
    const fetchCategory = async (): Promise<Category> => {
        const res = await axiosGet<Category>(`categories/${id}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchCategory,
        enabled: !!id && enabled !== false,
        queryKey: queryKeys.categories.detail(id),
    });
}
interface UseCategoryBySlugParams {
    enabled?: boolean;
    slug?: string;
}
export function useCategoryBySlug({ enabled, slug }: UseCategoryBySlugParams = {}) {
    const fetchCategoryBySlug = async (): Promise<Category> => {
        const res = await axiosGet<Category>(`categories/slug/${slug}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchCategoryBySlug,
        enabled: !!slug && enabled !== false,
        queryKey: queryKeys.categories.bySlug(slug),
    });
}
interface UseCourseProgressParams {
    enabled?: boolean;
    courseId?: string;
}
export function useCourseProgress({ enabled, courseId }: UseCourseProgressParams = {}) {
    const fetchCourseProgress = async (): Promise<CourseProgress> => {
        const res = await axiosGet<CourseProgress>(`progress/courses/${courseId}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchCourseProgress,
        enabled: !!courseId && enabled !== false,
        queryKey: queryKeys.progress.courseProgress(courseId),
    });
}
export const useUpdateProgress = () => {
    const queryClient = useQueryClient();
    const fetchUpdateProgressMutationFunction = async ({ courseId, dto, }: {
        courseId: string;
        dto: UpdateProgressDto;
    }): Promise<CourseProgress> => {
        const res = await axiosPut<CourseProgress>(`progress/courses/${courseId}`, dto);
        return res.data;
    };
    return useMutation({
        mutationKey: ["updateProgress"],
        mutationFn: fetchUpdateProgressMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.progress.courseProgress(variables.courseId), data);
        },
    });
};
interface UseCartParams {
    enabled?: boolean;
}
export function useCart({ enabled }: UseCartParams = {}) {
    const fetchCart = async (): Promise<CartItem[]> => {
        const res = await axiosGet<CartItem[]>("cart");
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchCart,
        enabled: enabled !== false,
        queryKey: queryKeys.cart.list(),
    });
}
export const useAddToCart = () => {
    const queryClient = useQueryClient();
    const fetchAddToCartMutationFunction = async (dto: AddToCartDto): Promise<CartItem> => {
        const res = await axiosPost<CartItem>("cart", dto);
        return res.data;
    };
    return useMutation({
        mutationKey: ["addToCart"],
        mutationFn: fetchAddToCartMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.cart.all(),
            });
        },
    });
};
export const useRemoveFromCart = () => {
    const queryClient = useQueryClient();
    const fetchRemoveFromCartMutationFunction = async (id: string): Promise<void> => {
        await axiosDelete(`cart/${id}`);
    };
    return useMutation({
        mutationKey: ["removeFromCart"],
        mutationFn: fetchRemoveFromCartMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.cart.all(),
            });
        },
    });
};
export const useClearCart = () => {
    const queryClient = useQueryClient();
    const fetchClearCartMutationFunction = async (): Promise<void> => {
        await axiosDelete("cart");
    };
    return useMutation({
        mutationKey: ["clearCart"],
        mutationFn: fetchClearCartMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.cart.all(),
            });
        },
    });
};
interface EnrollmentFilters {
    userId?: string;
    courseId?: string;
    companyId?: string;
    status?: string;
    page?: number;
    limit?: number;
}
interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
}
interface UseEnrollmentsParams {
    enabled?: boolean;
    filters?: EnrollmentFilters;
}
export function useEnrollments({ enabled, filters }: UseEnrollmentsParams = {}) {
    const fetchEnrollments = async (): Promise<{
        data: Enrollment[];
        pagination: PaginationInfo;
    }> => {
        const params: Record<string, string | number> = {};
        if (filters?.userId)
            params.userId = filters.userId;
        if (filters?.courseId)
            params.courseId = filters.courseId;
        if (filters?.companyId)
            params.companyId = filters.companyId;
        if (filters?.status)
            params.status = filters.status;
        if (filters?.page)
            params.page = filters.page;
        if (filters?.limit)
            params.limit = filters.limit;
        const res = await axiosGet<{
            data: Enrollment[];
            pagination: PaginationInfo;
        }>("enrollments", params);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchEnrollments,
        enabled: enabled !== false,
        queryKey: queryKeys.enrollments.list(filters),
    });
}
interface UseEnrollmentParams {
    enabled?: boolean;
    id?: string;
}
export function useEnrollment({ enabled, id }: UseEnrollmentParams = {}) {
    const fetchEnrollment = async (): Promise<Enrollment> => {
        const res = await axiosGet<Enrollment>(`enrollments/${id}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchEnrollment,
        enabled: !!id && enabled !== false,
        queryKey: queryKeys.enrollments.detail(id),
    });
}
export const useCreateEnrollment = () => {
    const queryClient = useQueryClient();
    const fetchCreateEnrollmentMutationFunction = async (data: CreateEnrollmentDto): Promise<Enrollment> => {
        const res = await axiosPost<Enrollment>("enrollments", data);
        return res.data;
    };
    return useMutation({
        mutationKey: ["createEnrollment"],
        mutationFn: fetchCreateEnrollmentMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.enrollments.all(),
            });
        },
    });
};
export function useGetUploadKey() {
    return useMutation({
        mutationFn: ({ type, fileName, courseId }: {
            type: 'course' | 'profile' | 'lesson';
            fileName?: string;
            courseId?: string;
        }) => storageApi.getUploadKey(type, fileName, courseId),
    });
}
export function useUploadFile() {
    return useMutation({
        mutationFn: ({ file, key }: {
            file: File;
            key: string;
        }) => storageApi.upload(file, key),
    });
}
