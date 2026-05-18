import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { axiosGet, axiosPost, axiosPut, axiosDelete } from '../api/client';
import { Lesson, CreateLessonDto, UpdateLessonDto, QuizQuestion } from '../api/services/lessons';
import { Section, CreateSectionDto, UpdateSectionDto } from '../api/services/sections';
interface UseLessonParams {
    enabled?: boolean;
    id?: string;
}
export function useLesson({ enabled, id }: UseLessonParams = {}) {
    const fetchLesson = async (): Promise<Lesson> => {
        const res = await axiosGet<Lesson>(`lessons/${id}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchLesson,
        enabled: !!id && enabled !== false,
        queryKey: queryKeys.lessons.detail(id),
    });
}
export const useCreateLesson = () => {
    const queryClient = useQueryClient();
    const fetchCreateLessonMutationFunction = async (dto: CreateLessonDto): Promise<Lesson> => {
        const res = await axiosPost<Lesson>("lessons", dto);
        return res.data;
    };
    return useMutation({
        mutationKey: ["createLesson"],
        mutationFn: fetchCreateLessonMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.sections.all(),
            });
        },
    });
};
export const useUpdateLesson = () => {
    const queryClient = useQueryClient();
    const fetchUpdateLessonMutationFunction = async ({ id, dto, }: {
        id: string;
        dto: UpdateLessonDto;
    }): Promise<Lesson> => {
        const res = await axiosPut<Lesson>(`lessons/${id}`, dto);
        return res.data;
    };
    return useMutation({
        mutationKey: ["updateLesson"],
        mutationFn: fetchUpdateLessonMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.lessons.detail(variables.id), data);
            queryClient.invalidateQueries({
                queryKey: queryKeys.sections.all(),
            });
        },
    });
};
export const useDeleteLesson = () => {
    const queryClient = useQueryClient();
    const fetchDeleteLessonMutationFunction = async (id: string): Promise<void> => {
        await axiosDelete(`lessons/${id}`);
    };
    return useMutation({
        mutationKey: ["deleteLesson"],
        mutationFn: fetchDeleteLessonMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.sections.all(),
            });
        },
    });
};
export const useApproveLesson = () => {
    const queryClient = useQueryClient();
    const fetchApproveLessonMutationFunction = async (id: string): Promise<Lesson> => {
        const res = await axiosPost<Lesson>(`lessons/${id}/approve`);
        return res.data;
    };
    return useMutation({
        mutationKey: ["approveLesson"],
        mutationFn: fetchApproveLessonMutationFunction,
        onSuccess: (data, id) => {
            queryClient.setQueryData(queryKeys.lessons.detail(id), data);
        },
    });
};
export const useReorderLessons = () => {
    const queryClient = useQueryClient();
    const fetchReorderLessonsMutationFunction = async ({ sectionId, lessons, }: {
        sectionId: string;
        lessons: {
            lessonId: string;
            order: number;
        }[];
    }): Promise<void> => {
        await axiosPost("lessons/reorder", { sectionId, lessons });
    };
    return useMutation({
        mutationKey: ["reorderLessons"],
        mutationFn: fetchReorderLessonsMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.sections.all(),
            });
        },
    });
};
export const useUpdateQuizQuestions = () => {
    const queryClient = useQueryClient();
    const fetchUpdateQuizQuestionsMutationFunction = async ({ lessonId, questions, }: {
        lessonId: string;
        questions: QuizQuestion[];
    }): Promise<Lesson> => {
        const res = await axiosPost<Lesson>(`lessons/${lessonId}/quiz-questions`, { questions });
        return res.data;
    };
    return useMutation({
        mutationKey: ["updateQuizQuestions"],
        mutationFn: fetchUpdateQuizQuestionsMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.lessons.detail(variables.lessonId), data);
        },
    });
};
interface UseSectionsParams {
    enabled?: boolean;
    courseId?: string;
}
export function useSections({ enabled, courseId }: UseSectionsParams = {}) {
    const fetchSections = async (): Promise<Section[]> => {
        const res = await axiosGet<Section[] | { data?: Section[] }>(`sections/course/${courseId}`);
        const raw = res.data;
        return Array.isArray(raw) ? raw : (raw && Array.isArray((raw as { data?: Section[] }).data) ? (raw as { data: Section[] }).data : []);
    };
    return useQuery({
        staleTime: 0,
        queryFn: fetchSections,
        enabled: !!courseId && enabled !== false,
        queryKey: queryKeys.sections.list(courseId),
        refetchOnWindowFocus: true,
    });
}
export const useCreateSection = () => {
    const queryClient = useQueryClient();
    const fetchCreateSectionMutationFunction = async (dto: CreateSectionDto): Promise<Section> => {
        const res = await axiosPost<Section>("sections", dto);
        return res.data;
    };
    return useMutation({
        mutationKey: ["createSection"],
        mutationFn: fetchCreateSectionMutationFunction,
        onSuccess: (_, dto) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.sections.list(dto.courseId),
            });
        },
    });
};
export const useUpdateSection = () => {
    const queryClient = useQueryClient();
    const fetchUpdateSectionMutationFunction = async ({ id, dto, }: {
        id: string;
        dto: UpdateSectionDto;
    }): Promise<Section> => {
        const res = await axiosPut<Section>(`sections/${id}`, dto);
        return res.data;
    };
    return useMutation({
        mutationKey: ["updateSection"],
        mutationFn: fetchUpdateSectionMutationFunction,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.sections.list(variables.dto.courseId),
            });
        },
    });
};
export const useDeleteSection = () => {
    const queryClient = useQueryClient();
    const fetchDeleteSectionMutationFunction = async ({ id, courseId, }: {
        id: string;
        courseId: string;
    }): Promise<void> => {
        await axiosDelete(`sections/${id}?courseId=${courseId}`);
    };
    return useMutation({
        mutationKey: ["deleteSection"],
        mutationFn: fetchDeleteSectionMutationFunction,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.sections.list(variables.courseId),
            });
        },
    });
};
export const useReorderSections = () => {
    const queryClient = useQueryClient();
    const fetchReorderSectionsMutationFunction = async ({ courseId, modules, }: {
        courseId: string;
        modules: {
            sectionId: string;
            order: number;
        }[];
    }): Promise<void> => {
        await axiosPost("sections/reorder", { courseId, modules });
    };
    return useMutation({
        mutationKey: ["reorderSections"],
        mutationFn: fetchReorderSectionsMutationFunction,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.sections.list(variables.courseId),
            });
        },
    });
};
