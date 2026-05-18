import { Category } from '../types';
import { parseJsonResponse, parseErrorResponse } from '@/lib/types/api';
import { env } from '@/lib/env';
const API_URL = env.NEXT_PUBLIC_API_URL;
export const categoriesApi = {
    async getAll(): Promise<Category[]> {
        const response = await fetch(`${API_URL}/categories`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch categories');
        }
        return parseJsonResponse<Category[]>(response);
    },
    async getById(id: string): Promise<Category> {
        const response = await fetch(`${API_URL}/categories/${id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch category');
        }
        return parseJsonResponse<Category>(response);
    },
    async getBySlug(slug: string): Promise<Category> {
        const response = await fetch(`${API_URL}/categories/slug/${slug}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch category');
        }
        return parseJsonResponse<Category>(response);
    },
};
