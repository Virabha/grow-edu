"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { axiosGet, axiosPut } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { UpdateUserDto, User } from "@/lib/api/services/users";
interface UseProfileParams {
    enabled?: boolean;
}
export function useProfile({ enabled }: UseProfileParams = {}) {
    const { user } = useAuthStore();
    const fetchProfile = async (): Promise<User> => {
        const res = await axiosGet<User>(`users/${user?.id}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchProfile,
        enabled: !!user?.id && enabled !== false,
        queryKey: queryKeys.users.detail(user?.id),
    });
}
export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const fetchUpdateProfileMutationFunction = async ({ userId, data, }: {
        userId: string;
        data: UpdateUserDto;
    }): Promise<User> => {
        const res = await axiosPut<User>(`users/${userId}`, data);
        return res.data;
    };
    return useMutation({
        mutationKey: ["updateProfile"],
        mutationFn: fetchUpdateProfileMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.users.detail(variables.userId), data);
            if (user?.id === variables.userId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.users.detail(user.id),
                });
            }
        },
    });
};
