import { apiClient } from "../client";

export interface Lesson {
  lessonId: string;
  sectionId: string;
  title: string;
  description: string | null;
  type: "VIDEO" | "TEXT" | "QUIZ";
  videoUrl: string | null;
  textContent: string | null;
  duration: number | null;
  isFreePreview: boolean;
  status: string;
  order: number;
}

export interface Section {
  sectionId: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  priceType: "INCLUDED" | "INDIVIDUAL" | "BOTH";
  sectionPrice: string | null;
  lessons?: Lesson[];
}

export interface Course {
  courseId: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string | null;
  thumbnail: string | null;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  categoryId: string;
  instructorId: string;
  level?: string;
  language?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string; description: string | null };
  instructor?: { id: string; firstName: string | null; lastName: string | null; email: string };
  sections?: Section[];
  accessibleSectionIds?: string[];
  learningOutcomes?: string[];
  requirements?: string[];
  targetAudience?: string[];
}

export interface CoursesResponse {
  data: Course[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CoursesParams {
  categoryId?: string;
  instructorId?: string;
  limit?: number;
  page?: number;
  search?: string;
  level?: string;
  sort?: string;
  status?: string;
}

export const coursesApi = {
  getCourses: (params?: CoursesParams) =>
    apiClient
      .get<CoursesResponse>("/courses", {
        params: {
          ...params,
          limit: params?.limit ?? 12,
          page: params?.page ?? 1,
        },
      })
      .then((r) => r.data),
  getById: (courseId: string) =>
    apiClient.get<Course>(`/courses/${courseId}`).then((r) => r.data),
  getBySlug: (slug: string) =>
    apiClient.get<Course>(`/courses/slug/${slug}`).then((r) => r.data),
};
