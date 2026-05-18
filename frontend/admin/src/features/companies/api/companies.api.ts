import { Company, CompaniesResponse, CreateCompanyDto, UpdateCompanyDto } from '../types';
import { parseJsonResponse, parseErrorResponse } from '@/lib/types/api';
import { env } from '@/lib/env';
const API_URL = env.NEXT_PUBLIC_API_URL;
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};
export const companiesApi = {
    async getAll(filters?: {
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<CompaniesResponse> {
        const params = new URLSearchParams();
        if (filters?.search)
            params.append('search', filters.search);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await fetch(`${API_URL}/companies?${params.toString()}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch companies');
        }
        return parseJsonResponse<CompaniesResponse>(response);
    },
    async getById(id: string): Promise<Company> {
        const response = await fetch(`${API_URL}/companies/${id}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch company');
        }
        return parseJsonResponse<Company>(response);
    },
    async create(dto: CreateCompanyDto): Promise<Company> {
        const response = await fetch(`${API_URL}/companies`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to create company');
        }
        return parseJsonResponse<Company>(response);
    },
    async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
        const response = await fetch(`${API_URL}/companies/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to update company');
        }
        return parseJsonResponse<Company>(response);
    },
    async delete(id: string): Promise<{
        message: string;
    }> {
        const response = await fetch(`${API_URL}/companies/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to delete company');
        }
        return parseJsonResponse<{
            message: string;
        }>(response);
    },
};
