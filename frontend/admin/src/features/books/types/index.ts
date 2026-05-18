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

export interface CreateBookDto {
  title: string;
  slug: string;
  author: string;
  description?: string;
  shortDescription?: string;
  coverImage?: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  categoryId?: string;
  isbn?: string;
  pages?: number;
  language?: string;
  publisher?: string;
  publishedYear?: number;
  format?: string;
  downloadUrl?: string;
  status?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateBookDto extends Partial<CreateBookDto> {}

export interface BookFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}
