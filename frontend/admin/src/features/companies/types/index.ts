export interface Company {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    createdAt: string;
    updatedAt: string;
    admins?: Array<{
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
    }>;
}
export interface CompaniesResponse {
    data: Company[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}
export interface CreateCompanyDto {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
}
export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {
}
