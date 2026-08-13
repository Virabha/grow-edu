import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, asc, desc, like, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { books, bookPurchases } from '../database/schema';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { FilterBooksDto } from './dto/filter-books.dto';
import { CacheService } from '../cache/cache.service';
import { StorageService } from '../storage/storage.service';
import { AppConfigService } from '../config';

const CACHE_TTL = 300;
const MAX_PAGE_LIMIT = 100;

@Injectable()
export class BooksService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly cache: CacheService,
    private readonly storageService: StorageService,
    private readonly configService: AppConfigService,
  ) {}

  private resolveUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    try {
      return this.storageService.getCdnUrl(url);
    } catch {
      return url;
    }
  }

  private resolveBookUrls<T extends { coverImage: string | null }>(rows: T[]): T[] {
    return rows.map((r) => ({ ...r, coverImage: this.resolveUrl(r.coverImage) }));
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async invalidateBooks() {
    await this.cache.delByPrefix('books');
  }

  async findAll(filters?: FilterBooksDto) {
    const limit = Math.min(filters?.limit || 12, MAX_PAGE_LIMIT);
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];

    if (filters?.search) {
      conditions.push(like(books.title, `%${filters.search}%`));
    }
    if (filters?.categoryId) {
      conditions.push(eq(books.categoryId, filters.categoryId));
    }
    if (filters?.status) {
      conditions.push(eq(books.status, filters.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'));
    }

    const whereClause = conditions.length > 0
      ? conditions.length === 1 ? conditions[0] : and(...conditions)
      : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(books)
        .where(whereClause)
        .orderBy(asc(books.displayOrder), desc(books.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(books)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      data: this.resolveBookUrls(data),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findPublished(filters?: FilterBooksDto) {
    const cacheKey = `books:public:${JSON.stringify(filters || {})}`;
    type BookPage = { data: (typeof books.$inferSelect)[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
    const cached = await this.cache.get<BookPage>(cacheKey);
    if (cached) return cached;

    const limit = Math.min(filters?.limit || 12, MAX_PAGE_LIMIT);
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      eq(books.status, 'PUBLISHED'),
      eq(books.isActive, true),
    ];

    if (filters?.search) {
      conditions.push(like(books.title, `%${filters.search}%`));
    }
    if (filters?.categoryId) {
      conditions.push(eq(books.categoryId, filters.categoryId));
    }

    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(books)
        .where(whereClause)
        .orderBy(asc(books.displayOrder), desc(books.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(books)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const result = {
      data: this.resolveBookUrls(data),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await this.cache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(books)
      .where(eq(books.bookId, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Book ${id} not found`);
    return { ...row, coverImage: this.resolveUrl(row.coverImage) };
  }

  async findBySlug(slug: string) {
    const [row] = await this.db
      .select()
      .from(books)
      .where(and(eq(books.slug, slug), eq(books.isActive, true)))
      .limit(1);
    if (!row) throw new NotFoundException(`Book ${slug} not found`);
    return { ...row, coverImage: this.resolveUrl(row.coverImage) };
  }

  async create(dto: CreateBookDto) {
    const slug = dto.slug || this.generateSlug(dto.title);
    const [existing] = await this.db
      .select()
      .from(books)
      .where(eq(books.slug, slug))
      .limit(1);
    if (existing) throw new ConflictException('Book with this slug already exists');

    const [row] = await this.db
      .insert(books)
      .values({
        title: dto.title,
        slug,
        author: dto.author,
        description: dto.description ?? null,
        shortDescription: dto.shortDescription ?? null,
        coverImage: dto.coverImage ?? null,
        price: String(dto.price),
        compareAtPrice: dto.compareAtPrice != null ? String(dto.compareAtPrice) : null,
        currency: dto.currency ?? 'INR',
        categoryId: dto.categoryId ?? null,
        isbn: dto.isbn ?? null,
        pages: dto.pages ?? null,
        language: dto.language ?? 'English',
        publisher: dto.publisher ?? null,
        publishedYear: dto.publishedYear ?? null,
        format: dto.format ?? 'PHYSICAL',
        downloadUrl: dto.downloadUrl ?? null,
        status: dto.status ?? 'DRAFT',
        isActive: dto.isActive ?? true,
        displayOrder: dto.displayOrder ?? 0,
      })
      .returning();
    await this.invalidateBooks();
    return row;
  }

  async update(id: string, dto: UpdateBookDto) {
    await this.findById(id);

    if (dto.slug) {
      const [dup] = await this.db
        .select()
        .from(books)
        .where(eq(books.slug, dto.slug))
        .limit(1);
      if (dup && dup.bookId !== id) {
        throw new ConflictException('Book with this slug already exists');
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const fields = [
      'title', 'slug', 'author', 'description', 'shortDescription',
      'coverImage', 'currency', 'categoryId', 'isbn', 'pages',
      'language', 'publisher', 'publishedYear', 'format', 'downloadUrl',
      'status', 'isActive', 'displayOrder',
    ] as const;

    for (const key of fields) {
      if ((dto as Record<string, unknown>)[key] !== undefined) {
        updates[key] = (dto as Record<string, unknown>)[key];
      }
    }
    if (dto.price !== undefined) updates.price = String(dto.price);
    if (dto.compareAtPrice !== undefined) updates.compareAtPrice = String(dto.compareAtPrice);

    const [row] = await this.db
      .update(books)
      .set(updates)
      .where(eq(books.bookId, id))
      .returning();
    await this.invalidateBooks();
    return row;
  }

  async remove(id: string) {
    await this.findById(id);
    await this.db.delete(books).where(eq(books.bookId, id));
    await this.invalidateBooks();
    return { deleted: true, bookId: id };
  }

  async purchaseBook(userId: string, bookId: string, _successUrl?: string, _cancelUrl?: string) {
    void _successUrl; void _cancelUrl;
    const book = await this.findById(bookId);
    if (book.status !== 'PUBLISHED') {
      throw new BadRequestException('Book is not available for purchase');
    }

    const [existing] = await this.db
      .select()
      .from(bookPurchases)
      .where(and(
        eq(bookPurchases.userId, userId),
        eq(bookPurchases.bookId, bookId),
        eq(bookPurchases.status, 'COMPLETED'),
      ))
      .limit(1);

    if (existing) {
      throw new ConflictException('You already purchased this book');
    }

    const amount = Number(book.price || 0);

    if (amount === 0) {
      const [purchase] = await this.db
        .insert(bookPurchases)
        .values({
          userId,
          bookId,
          amount: '0',
          currency: book.currency,
          gateway: 'FREE',
          status: 'COMPLETED',
        })
        .returning();
      return { success: true, purchaseId: purchase.purchaseId, free: true };
    }

    // Manual-QR flow: create pending purchase. Learner uploads proof; admin approves.
    const [purchase] = await this.db
      .insert(bookPurchases)
      .values({
        userId,
        bookId,
        amount: String(amount),
        currency: book.currency,
        gateway: 'MANUAL_QR',
        status: 'PENDING',
      })
      .returning();

    return {
      purchaseId: purchase.purchaseId,
      amount,
      currency: book.currency,
      status: 'PENDING',
      message: 'Pay via QR/bank and upload proof through /payments to complete.',
    };
  }

  async verifyBookPurchase(purchaseId: string, userId: string) {
    const [purchase] = await this.db
      .select()
      .from(bookPurchases)
      .where(and(
        eq(bookPurchases.purchaseId, purchaseId),
        eq(bookPurchases.userId, userId),
      ))
      .limit(1);

    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.status === 'COMPLETED') {
      return { success: true, message: 'Purchase already completed' };
    }

    // Manual-QR flow: admin approves via payments endpoints.
    // Self-verify is a no-op for non-COMPLETED states.
    return { success: false, message: 'Awaiting admin approval' };
  }

  async getUserPurchases(userId: string) {
    const purchases = await this.db.query.bookPurchases.findMany({
      where: and(
        eq(bookPurchases.userId, userId),
        eq(bookPurchases.status, 'COMPLETED'),
      ),
      with: { book: true },
    });

    return purchases.map((p) => ({
      ...p,
      book: p.book ? { ...p.book, coverImage: this.resolveUrl(p.book.coverImage) } : null,
    }));
  }

  async hasUserPurchased(userId: string, bookId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: bookPurchases.purchaseId })
      .from(bookPurchases)
      .where(and(
        eq(bookPurchases.userId, userId),
        eq(bookPurchases.bookId, bookId),
        eq(bookPurchases.status, 'COMPLETED'),
      ))
      .limit(1);
    return !!row;
  }
}
