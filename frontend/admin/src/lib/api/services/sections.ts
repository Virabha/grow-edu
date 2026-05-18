import { apiClient } from '../client';
import { Lesson } from './lessons';
export interface Section {
    sectionId: string;
    courseId: string;
    title: string;
    description?: string;
    order: number;
    priceType: 'INCLUDED' | 'INDIVIDUAL' | 'BOTH';
    sectionPrice?: string;
    isDeleted: boolean;
    lessons?: Lesson[];
}
export interface CreateSectionDto {
    courseId: string;
    title: string;
    description?: string;
    order: number;
    priceType?: 'INCLUDED' | 'INDIVIDUAL' | 'BOTH';
    sectionPrice?: number;
}
export interface UpdateSectionDto {
    courseId: string;
    title?: string;
    description?: string;
    order?: number;
    priceType?: 'INCLUDED' | 'INDIVIDUAL' | 'BOTH';
    sectionPrice?: number;
}
export const sectionsApi = {
    getAll: async (courseId: string): Promise<Section[]> => {
        const { data } = await apiClient.get(`/sections/course/${courseId}`);
        return data;
    },
    create: async (dto: CreateSectionDto): Promise<Section> => {
        const { data } = await apiClient.post('/sections', dto);
        return data;
    },
    update: async (id: string, dto: UpdateSectionDto): Promise<Section> => {
        const { data } = await apiClient.put(`/sections/${id}`, dto);
        return data;
    },
    delete: async (id: string, courseId: string) => {
        const { data } = await apiClient.delete(`/sections/${id}?courseId=${courseId}`);
        return data;
    },
    reorder: async (courseId: string, modules: {
        sectionId: string;
        order: number;
    }[]) => {
        const { data } = await apiClient.post('/sections/reorder', { courseId, modules });
        return data;
    },
};
