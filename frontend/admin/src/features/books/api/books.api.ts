import { apiClient } from "@/lib/api/client";
import type { Book, BooksResponse, CreateBookDto, UpdateBookDto, BookFilters } from "../types";

export const booksApi = {
  getAll: (filters?: BookFilters) =>
    apiClient.get<BooksResponse>("/books/admin", { params: filters }).then((r) => r.data),
  getById: (id: string) =>
    apiClient.get<Book>(`/books/${id}`).then((r) => r.data),
  create: (dto: CreateBookDto) =>
    apiClient.post<Book>("/books", dto).then((r) => r.data),
  update: (id: string, dto: UpdateBookDto) =>
    apiClient.put<Book>(`/books/${id}`, dto).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/books/${id}`).then((r) => r.data),
};
