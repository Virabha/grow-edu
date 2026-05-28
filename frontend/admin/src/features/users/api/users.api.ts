import { apiClient } from "@/lib/api/client";
import type {
  User,
  UsersResponse,
  UpdateUserDto,
  UserFilters,
} from "../types";

export const usersApi = {
  async getAll(
    filters?: UserFilters & { companyId?: string },
  ): Promise<UsersResponse> {
    const params: Record<string, string> = {};
    if (filters?.role) params.role = filters.role;
    if (filters?.search) params.search = filters.search;
    if (filters?.companyId) params.companyId = filters.companyId;
    if (filters?.page) params.page = String(filters.page);
    if (filters?.limit) params.limit = String(filters.limit);
    const res = await apiClient.get<UsersResponse>("/users", { params });
    return res.data;
  },

  async getById(id: string): Promise<User> {
    const res = await apiClient.get<User>(`/users/${id}`);
    return res.data;
  },

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const res = await apiClient.put<User>(`/users/${id}`, dto);
    return res.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/users/${id}`);
    return res.data;
  },
};
