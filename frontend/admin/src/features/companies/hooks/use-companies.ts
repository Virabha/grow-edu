"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { axiosGet, axiosPost, axiosPut, axiosDelete } from "@/lib/api/client";
import { CreateCompanyDto, UpdateCompanyDto, CompanyFilters, Company } from "@/lib/api/services/companies";
interface UseCompaniesParams {
    enabled?: boolean;
    filters?: CompanyFilters;
}
interface CompaniesResponse {
    data: Company[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}
export function useCompanies({ enabled, filters }: UseCompaniesParams = {}) {
    const fetchCompanies = async (): Promise<CompaniesResponse> => {
        const params: Record<string, string | number> = {};
        if (filters?.search)
            params.search = filters.search;
        if (filters?.page)
            params.page = filters.page;
        if (filters?.limit)
            params.limit = filters.limit;
        const res = await axiosGet<CompaniesResponse>("companies", params);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchCompanies,
        enabled: enabled !== false,
        queryKey: queryKeys.companies.list(filters),
    });
}
interface UseCompanyParams {
    enabled?: boolean;
    id?: string;
}
export function useCompany({ enabled, id }: UseCompanyParams = {}) {
    const fetchCompany = async (): Promise<Company> => {
        const res = await axiosGet<Company>(`companies/${id}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchCompany,
        enabled: !!id && enabled !== false,
        queryKey: queryKeys.companies.detail(id),
    });
}
export const useCreateCompany = () => {
    const queryClient = useQueryClient();
    const fetchCreateCompanyMutationFunction = async (data: CreateCompanyDto): Promise<Company> => {
        const res = await axiosPost<Company>("companies", data);
        return res.data;
    };
    return useMutation({
        mutationKey: ["createCompany"],
        mutationFn: fetchCreateCompanyMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.companies.all(),
            });
        },
    });
};
export const useUpdateCompany = () => {
    const queryClient = useQueryClient();
    const fetchUpdateCompanyMutationFunction = async ({ id, data, }: {
        id: string;
        data: UpdateCompanyDto;
    }): Promise<Company> => {
        const res = await axiosPut<Company>(`companies/${id}`, data);
        return res.data;
    };
    return useMutation({
        mutationKey: ["updateCompany"],
        mutationFn: fetchUpdateCompanyMutationFunction,
        onSuccess: (data, variables) => {
            queryClient.setQueryData(queryKeys.companies.detail(variables.id), data);
            queryClient.invalidateQueries({
                queryKey: queryKeys.companies.all(),
            });
        },
    });
};
export const useDeleteCompany = () => {
    const queryClient = useQueryClient();
    const fetchDeleteCompanyMutationFunction = async (id: string): Promise<void> => {
        await axiosDelete(`companies/${id}`);
    };
    return useMutation({
        mutationKey: ["deleteCompany"],
        mutationFn: fetchDeleteCompanyMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.companies.all(),
            });
        },
    });
};
