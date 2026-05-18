import { apiClient } from '../client';
export interface Company {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    admins?: { id: string; email: string; firstName?: string; lastName?: string }[];
    createdAt: string;
    updatedAt: string;
}
export interface CreateCompanyDto {
    name: string;
    email: string;
    phone?: string;
    address?: string;
}
export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {
}
export interface CompanyFilters {
    search?: string;
    page?: number;
    limit?: number;
}
export const companiesApi = {
    getAll: async (filters?: CompanyFilters) => {
        const params = new URLSearchParams();
        if (filters?.search)
            params.set('search', filters.search);
        if (filters?.page)
            params.set('page', String(filters.page));
        if (filters?.limit)
            params.set('limit', String(filters.limit));
        const { data } = await apiClient.get(`/companies?${params.toString()}`);
        return data;
    },
    getById: async (id: string): Promise<Company> => {
        const { data } = await apiClient.get(`/companies/${id}`);
        return data;
    },
    create: async (dto: CreateCompanyDto): Promise<Company> => {
        const { data } = await apiClient.post('/companies', dto);
        return data;
    },
    update: async (id: string, dto: UpdateCompanyDto): Promise<Company> => {
        const { data } = await apiClient.put(`/companies/${id}`, dto);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await apiClient.delete(`/companies/${id}`);
        return data;
    },
};
