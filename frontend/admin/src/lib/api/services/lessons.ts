import { apiClient } from "../client";
export interface QuizQuestionEntity {
    quizQuestionId: string;
    lessonId: string;
    question: string;
    answers: {
        text: string;
        isCorrect: boolean;
    }[];
    explanation?: string;
    order: number;
}
export interface Lesson {
    lessonId: string;
    sectionId: string;
    title: string;
    description?: string;
    type: "VIDEO" | "TEXT" | "QUIZ";
    videoUrl?: string;
    textContent?: string;
    resources?: {
        label: string;
        url: string;
    }[];
    quizSettings?: {
        passingPercentage?: number;
        timeLimitMinutes?: number;
        attemptsAllowed?: number;
        shuffleQuestions?: boolean;
        mandatory?: boolean;
    };
    duration?: number;
    isFreePreview?: boolean;
    status: string;
    order: number;
    questions?: QuizQuestionEntity[];
}
export interface QuizQuestion {
    quizQuestionId?: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
}
export interface CreateLessonDto {
    sectionId: string;
    title: string;
    type: "VIDEO" | "TEXT" | "QUIZ";
    order: number;
    description?: string;
    duration?: number;
    isFreePreview?: boolean;
    resources?: {
        label: string;
        url: string;
    }[];
    quizSettings?: Lesson["quizSettings"];
}
export interface UpdateLessonDto {
    title?: string;
    description?: string;
    videoUrl?: string;
    textContent?: string;
    resources?: {
        label: string;
        url: string;
    }[];
    quizSettings?: Lesson["quizSettings"];
    bumpQuizVersion?: boolean;
    duration?: number;
    isFreePreview?: boolean;
    status?: string;
    order?: number;
}
export const lessonsApi = {
    getById: async (id: string): Promise<Lesson> => {
        const { data } = await apiClient.get(`/lessons/${id}`);
        return data;
    },
    create: async (dto: CreateLessonDto): Promise<Lesson> => {
        const { data } = await apiClient.post("/lessons", dto);
        return data;
    },
    update: async (id: string, dto: UpdateLessonDto): Promise<Lesson> => {
        const { data } = await apiClient.put(`/lessons/${id}`, dto);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await apiClient.delete(`/lessons/${id}`);
        return data;
    },
    approve: async (id: string) => {
        const { data } = await apiClient.post(`/lessons/${id}/approve`);
        return data;
    },
    reorder: async (sectionId: string, lessons: {
        lessonId: string;
        order: number;
    }[]) => {
        const { data } = await apiClient.post("/lessons/reorder", {
            sectionId,
            lessons,
        });
        return data;
    },
    updateQuizQuestions: async (lessonId: string, questions: QuizQuestion[]) => {
        const { data } = await apiClient.post(`/lessons/${lessonId}/quiz-questions`, { questions });
        return data;
    },
};
