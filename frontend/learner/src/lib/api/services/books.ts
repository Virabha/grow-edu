import { apiClient } from "../client";

export interface Book {
  bookId: string;
  title: string;
  slug: string;
  author: string;
  description: string | null;
  shortDescription: string | null;
  coverImage: string | null;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  categoryId: string | null;
  isbn: string | null;
  pages: number | null;
  language: string | null;
  publisher: string | null;
  publishedYear: number | null;
  format: string | null;
  downloadUrl: string | null;
  status: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BooksResponse {
  data: Book[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface BooksParams {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseResponse {
  purchaseId: string;
  checkoutUrl?: string;
  sessionId?: string;
  free?: boolean;
  success?: boolean;
}

export const booksApi = {
  getBooks: (params?: BooksParams) =>
    apiClient
      .get<BooksResponse>("/books", {
        params: { ...params, limit: params?.limit ?? 12, page: params?.page ?? 1 },
      })
      .then((r) => r.data),
  getById: (id: string) =>
    apiClient.get<Book>(`/books/${id}`).then((r) => r.data),
  getBySlug: (slug: string) =>
    apiClient.get<Book>(`/books/slug/${slug}`).then((r) => r.data),
  purchase: (bookId: string, data?: { successUrl?: string; cancelUrl?: string }) =>
    apiClient.post<PurchaseResponse>(`/books/${bookId}/purchase`, data || {}).then((r) => r.data),
  verifyPurchase: (purchaseId: string) =>
    apiClient.post(`/books/purchases/${purchaseId}/verify`).then((r) => r.data),
  getMyPurchases: () =>
    apiClient.get("/books/my-purchases").then((r) => r.data),
};
