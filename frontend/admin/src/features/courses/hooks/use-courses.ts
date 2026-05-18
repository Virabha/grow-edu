"use client";
import { useCourses as useAllCourses, useCourse as useSingleCourse, useCourseBySlug as useCourseSlug, useCreateCourse as useCreateCourseMutation, useUpdateCourse as useUpdateCourseMutation, useDeleteCourse as useDeleteCourseMutation, useSubmitCourseForReview as useSubmitMutation, useApproveCourse as useApproveMutation, useRejectCourse as useRejectMutation, useRequestCourseChanges as useRequestChangesMutation, } from "@/lib/hooks/use-courses";
import type { CourseFilters, CreateCourseDto, UpdateCourseDto } from "@/lib/api/services/courses";
export type CourseCreateInput = CreateCourseDto;
export type CourseUpdateInput = UpdateCourseDto;
interface UseCoursesParams {
    enabled?: boolean;
    filters?: CourseFilters;
}
export function useCourses({ enabled, filters }: UseCoursesParams = {}) {
    return useAllCourses({ enabled, filters });
}
interface UseCourseParams {
    enabled?: boolean;
    courseId?: string;
}
export function useCourse({ enabled, courseId }: UseCourseParams = {}) {
    return useSingleCourse({ enabled, id: courseId });
}
interface UseCourseBySlugParams {
    enabled?: boolean;
    slug?: string;
}
export function useCourseBySlug({ enabled, slug }: UseCourseBySlugParams = {}) {
    return useCourseSlug({ enabled, slug });
}
export function useCreateCourse() {
    const mutation = useCreateCourseMutation();
    return mutation;
}
export function useUpdateCourse() {
    const mutation = useUpdateCourseMutation();
    return mutation;
}
export function useDeleteCourse() {
    const mutation = useDeleteCourseMutation();
    return mutation;
}
export function useSubmitCourseForReview() {
    const mutation = useSubmitMutation();
    return mutation;
}
export function useApproveCourse() {
    const mutation = useApproveMutation();
    return mutation;
}
export function useRejectCourse() {
    const mutation = useRejectMutation();
    return mutation;
}
export function useRequestCourseChanges() {
    const mutation = useRequestChangesMutation();
    return mutation;
}
