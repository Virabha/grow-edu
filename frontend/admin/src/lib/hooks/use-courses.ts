import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { axiosGet, axiosPost, axiosPut, axiosDelete } from '../api/client';
import { CourseFilters, CreateCourseDto, UpdateCourseDto, Course, CoursesResponse, coursesApi } from '../api/services/courses';
interface UseCoursesParams {
    enabled?: boolean;
    filters?: CourseFilters;
}
export function useCourses({ enabled, filters }: UseCoursesParams = {}) {
    const fetchCourses = async (): Promise<CoursesResponse> => {
        const params: Record<string, string | number> = {};
        if (filters?.search)
            params.search = filters.search;
        if (filters?.categoryId)
            params.categoryId = filters.categoryId;
        if (filters?.status)
            params.status = filters.status;
        if (filters?.instructorId)
            params.instructorId = filters.instructorId;
        if (filters?.page)
            params.page = filters.page;
        if (filters?.limit)
            params.limit = filters.limit;
        const res = await axiosGet<CoursesResponse>("courses", params);
        return res.data;
    };
    return useQuery({
        staleTime: 30000,
        queryFn: fetchCourses,
        enabled: enabled !== false,
        queryKey: queryKeys.courses.list(filters),
        refetchOnWindowFocus: false,
    });
}
interface UseCourseParams {
    enabled?: boolean;
    id?: string;
}
export function useCourse({ enabled, id }: UseCourseParams = {}) {
    const fetchCourse = async (): Promise<Course> => {
        const res = await axiosGet<Course>(`courses/${id}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchCourse,
        enabled: !!id && enabled !== false,
        queryKey: queryKeys.courses.detail(id),
    });
}
interface UseCourseBySlugParams {
    enabled?: boolean;
    slug?: string;
}
export function useCourseBySlug({ enabled, slug }: UseCourseBySlugParams = {}) {
    const fetchCourseBySlug = async (): Promise<Course> => {
        const res = await axiosGet<Course>(`courses/slug/${slug}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchCourseBySlug,
        enabled: !!slug && enabled !== false,
        queryKey: queryKeys.courses.bySlug(slug),
    });
}
export const useCreateCourse = () => {
    const queryClient = useQueryClient();
    const fetchCreateCourseMutationFunction = async (data: CreateCourseDto): Promise<Course> => {
        const res = await axiosPost<Course>("courses", data);
        return res.data;
    };
    return useMutation({
        mutationKey: ["createCourse"],
        mutationFn: fetchCreateCourseMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.courses.all(),
                refetchType: "all",
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.instructor.all(),
                refetchType: "all",
            });
        },
    });
};
export const useUpdateCourse = () => {
    const queryClient = useQueryClient();
    const fetchUpdateCourseMutationFunction = async ({ id, dto, }: {
        id: string;
        dto: UpdateCourseDto;
    }): Promise<Course> => {
        const res = await axiosPut<Course>(`courses/${id}`, dto);
        return res.data;
    };
    return useMutation({
        mutationKey: ["updateCourse"],
        mutationFn: fetchUpdateCourseMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.courses.detail(variables.id), data);
            queryClient.invalidateQueries({
                queryKey: queryKeys.courses.all(),
                refetchType: "all",
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.instructor.all(),
                refetchType: "all",
            });
        },
    });
};
export const useDeleteCourse = () => {
    const queryClient = useQueryClient();
    const fetchDeleteCourseMutationFunction = async (id: string): Promise<void> => {
        await axiosDelete(`courses/${id}`);
    };
    return useMutation({
        mutationKey: ["deleteCourse"],
        mutationFn: fetchDeleteCourseMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.courses.all(),
                refetchType: "all",
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.instructor.all(),
                refetchType: "all",
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.dashboard.all(),
                refetchType: "all",
            });
        },
    });
};
export const useSubmitCourseForReview = () => {
    const queryClient = useQueryClient();
    const fetchSubmitCourseForReviewMutationFunction = async (id: string): Promise<Course> => {
        const res = await axiosPost<Course>(`courses/${id}/submit-review`);
        return res.data;
    };
    return useMutation({
        mutationKey: ["submitCourseForReview"],
        mutationFn: fetchSubmitCourseForReviewMutationFunction,
        onSuccess: (data, id) => {
            queryClient.setQueryData(queryKeys.courses.detail(id), data);
            queryClient.invalidateQueries({
                queryKey: queryKeys.courses.all(),
                refetchType: "all",
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.instructor.all(),
                refetchType: "all",
            });
        },
    });
};
export const useApproveCourse = () => {
    const queryClient = useQueryClient();
    const fetchApproveCourseMutationFunction = async ({ id, notes, publish, }: {
        id: string;
        notes?: string;
        publish?: boolean;
    }): Promise<Course> => {
        return coursesApi.approve(id, notes, publish);
    };
    return useMutation({
        mutationKey: ["approveCourse"],
        mutationFn: fetchApproveCourseMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.courses.detail(variables.id), data);
            queryClient.invalidateQueries({
                queryKey: queryKeys.courses.all(),
            });
        },
    });
};
export const useRejectCourse = () => {
    const queryClient = useQueryClient();
    const fetchRejectCourseMutationFunction = async ({ id, reason, }: {
        id: string;
        reason: string;
    }): Promise<Course> => {
        const res = await axiosPost<Course>(`courses/${id}/reject`, { reason });
        return res.data;
    };
    return useMutation({
        mutationKey: ["rejectCourse"],
        mutationFn: fetchRejectCourseMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.courses.detail(variables.id), data);
            queryClient.invalidateQueries({
                queryKey: queryKeys.courses.all(),
            });
        },
    });
};
export const useRequestCourseChanges = () => {
    const queryClient = useQueryClient();
    const fetchRequestCourseChangesMutationFunction = async ({ id, notes, }: {
        id: string;
        notes?: string;
    }): Promise<Course> => {
        const res = await axiosPost<Course>(`courses/${id}/request-changes`, { notes });
        return res.data;
    };
    return useMutation({
        mutationKey: ["requestCourseChanges"],
        mutationFn: fetchRequestCourseChangesMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.courses.detail(variables.id), data);
        },
    });
};
export const useUnpublishCourse = () => {
    const queryClient = useQueryClient();
    const fetchUnpublishCourseMutationFunction = async (id: string): Promise<Course> => {
        const res = await axiosPost<Course>(`courses/${id}/unpublish`);
        return res.data;
    };
    return useMutation({
        mutationKey: ["unpublishCourse"],
        mutationFn: fetchUnpublishCourseMutationFunction,
        onSuccess: (data, id) => {
            queryClient.setQueryData(queryKeys.courses.detail(id), data);
            queryClient.invalidateQueries({
                queryKey: queryKeys.courses.all(),
            });
        },
    });
};
