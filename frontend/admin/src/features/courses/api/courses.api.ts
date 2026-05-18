import { apiClient } from "@/lib/api";
import { Course, CoursesResponse, CourseFilters, CreateCourseDto, UpdateCourseDto, } from "../types";
export const coursesApi = {
    async getAll(filters?: CourseFilters): Promise<CoursesResponse> {
        const params = new URLSearchParams();
        if (filters?.categoryId)
            params.append("categoryId", filters.categoryId);
        if (filters?.instructorId)
            params.append("instructorId", filters.instructorId);
        if (filters?.status)
            params.append("status", filters.status);
        if (filters?.search)
            params.append("search", filters.search);
        if (filters?.page)
            params.append("page", filters.page.toString());
        if (filters?.limit)
            params.append("limit", filters.limit.toString());
        const response = await apiClient.get(`/courses?${params.toString()}`);
        return response.data;
    },
    async getById(id: string): Promise<Course> {
        const response = await apiClient.get(`/courses/${id}`);
        return response.data;
    },
    async getBySlug(slug: string): Promise<Course> {
        const response = await apiClient.get(`/courses/slug/${slug}`);
        return response.data;
    },
    async create(dto: CreateCourseDto): Promise<Course> {
        const response = await apiClient.post(`/courses`, dto);
        return response.data;
    },
    async update(id: string, dto: UpdateCourseDto): Promise<Course> {
        const response = await apiClient.put(`/courses/${id}`, dto);
        return response.data;
    },
    async delete(id: string): Promise<{
        message: string;
    }> {
        const response = await apiClient.delete(`/courses/${id}`);
        return response.data;
    },
};
