"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { axiosGet, axiosPost, axiosPut } from "@/lib/api/client";
import type { Enrollment, CreateEnrollmentDto } from "../types";
interface UseEnrollmentsParams {
    enabled?: boolean;
    refetchOnMount?: boolean | "always";
    filters?: {
        userId?: string;
        courseId?: string;
        companyId?: string;
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    };
}
export function useEnrollments({ enabled, refetchOnMount, filters }: UseEnrollmentsParams = {}) {
    const fetchEnrollments = async (): Promise<{
        data: Enrollment[];
        pagination: { page: number; limit: number; total: number; totalPages?: number };
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
        if (filters?.search)
            params.search = filters.search;
        if (filters?.page)
            params.page = filters.page;
        if (filters?.limit)
            params.limit = filters.limit;
        const res = await axiosGet<{
            data: Enrollment[];
            pagination: { page: number; limit: number; total: number; totalPages?: number };
        }>("enrollments", params);
        return res.data;
    };
    return useQuery({
        staleTime: 0,
        queryFn: fetchEnrollments,
        enabled: enabled !== false,
        refetchOnMount: refetchOnMount ?? "always",
        refetchOnWindowFocus: true,
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
export const useUpdateEnrollmentStatus = () => {
    const queryClient = useQueryClient();
    const fetchUpdateEnrollmentStatusMutationFunction = async ({ enrollmentId, status, }: {
        enrollmentId: string;
        status: "ACTIVE" | "COMPLETED" | "REVOKED";
    }): Promise<Enrollment> => {
        const res = await axiosPut<Enrollment>(`enrollments/${enrollmentId}/status`, { status });
        return res.data;
    };
    return useMutation({
        mutationKey: ["updateEnrollmentStatus"],
        mutationFn: fetchUpdateEnrollmentStatusMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.enrollments.detail(variables.enrollmentId), data);
            queryClient.invalidateQueries({
                queryKey: queryKeys.enrollments.all(),
            });
        },
    });
};
export function useCheckEnrollment({ enabled, courseId }: {
    enabled?: boolean;
    courseId: string;
}) {
    const fetchCheckEnrollment = async (): Promise<{
        isEnrolled: boolean;
        enrollmentId?: string;
    }> => {
        const res = await axiosGet<{
            isEnrolled: boolean;
            enrollmentId?: string;
        }>(`enrollments/check-access/${courseId}`);
        return res.data;
    };
    return useQuery({
        staleTime: 5 * 60 * 1000,
        queryFn: fetchCheckEnrollment,
        enabled: !!courseId && enabled !== false,
        queryKey: ['enrollment-check', courseId],
    });
}
