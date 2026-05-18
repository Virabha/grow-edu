"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { axiosGet, axiosPut, axiosDelete } from "@/lib/api/client";
import { UserFilters, UpdateUserDto, UsersResponse, User } from "@/lib/api/services/users";
interface UseUsersParams {
    enabled?: boolean;
    filters?: UserFilters & {
        companyId?: string;
    };
}
export function useUsers({ enabled, filters }: UseUsersParams = {}) {
    const fetchUsers = async (): Promise<UsersResponse> => {
        const params: Record<string, string | number> = {};
        if (filters?.search)
            params.search = filters.search;
        if (filters?.role)
            params.role = filters.role;
        if (filters?.page)
            params.page = filters.page;
        if (filters?.limit)
            params.limit = filters.limit;
        if (filters?.companyId)
            params.companyId = filters.companyId;
        const res = await axiosGet<UsersResponse>("users", params);
        return res.data;
    };
    return useQuery({
        staleTime: 30000,
        queryFn: fetchUsers,
        enabled: enabled !== false,
        refetchOnWindowFocus: false,
        queryKey: queryKeys.users.list(filters),
    });
}
interface UseUserParams {
    enabled?: boolean;
    id?: string;
}
export function useUser({ enabled, id }: UseUserParams = {}) {
    const fetchUser = async (): Promise<User> => {
        const res = await axiosGet<User>(`users/${id}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchUser,
        enabled: !!id && enabled !== false,
        queryKey: queryKeys.users.detail(id),
    });
}
export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    const fetchUpdateUserMutationFunction = async ({ id, data, }: {
        id: string;
        data: UpdateUserDto;
    }): Promise<User> => {
        const res = await axiosPut<User>(`users/${id}`, data);
        return res.data;
    };
    return useMutation({
        mutationKey: ["updateUser"],
        mutationFn: fetchUpdateUserMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.users.detail(variables.id), data);
            queryClient.invalidateQueries({
                queryKey: queryKeys.users.all(),
            });
        },
    });
};
export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    const fetchDeleteUserMutationFunction = async (id: string): Promise<void> => {
        await axiosDelete(`users/${id}`);
    };
    return useMutation({
        mutationKey: ["deleteUser"],
        mutationFn: fetchDeleteUserMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.users.all(),
            });
        },
    });
};
