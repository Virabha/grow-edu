import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { axiosGet, axiosPost, axiosDelete } from '../api/client';
import { Category } from '../api/services/categories';
import { CartItem, AddToCartDto } from '../api/services/cart';
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
export function useGetUploadKey() {
    return useMutation({
        mutationFn: ({ type, fileName }: {
            type: 'batch' | 'profile' | 'lesson';
            fileName?: string;
        }) => storageApi.getUploadKey(type, fileName),
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
