import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, sql, asc, ilike } from 'drizzle-orm';
import { categories, courses } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CacheService } from '../cache/cache.service';
import { StorageService } from '../storage/storage.service';

// Hard cap for categories - prevents unbounded reads
const MAX_CATEGORIES = 200;
const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly cacheService: CacheService,
    private readonly storageService: StorageService,
  ) {}

  /** Resolve a storage key to a full CDN URL. Pass-through for nulls and existing URLs. */
  private resolveImageUrl(imageUrl: string | null | undefined): string | null {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    try {
      return this.storageService.getCdnUrl(imageUrl);
    } catch {
      return imageUrl;
    }
  }

  /** Ensure parent exists and is itself a root category (max 2 levels). */
  private async validateParent(parentId: string | null | undefined, selfId?: string) {
    if (!parentId) return;
    if (selfId && parentId === selfId) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    const [parent] = await this.db
      .select({
        categoryId: categories.categoryId,
        parentCategoryId: categories.parentCategoryId,
      })
      .from(categories)
      .where(and(eq(categories.categoryId, parentId), eq(categories.isDeleted, false)))
      .limit(1);
    if (!parent) {
      throw new NotFoundException(`Parent category ${parentId} not found`);
    }
    if (parent.parentCategoryId) {
      throw new BadRequestException(
        'Only two levels of nesting are supported. The selected parent is already a subcategory.',
      );
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ==================== PUBLIC METHODS ====================

  async findAll() {
    const cacheKey = 'categories:public:all';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Only return active, non-deleted categories for public API
    const flat = await this.db
      .select({
        categoryId: categories.categoryId,
        parentCategoryId: categories.parentCategoryId,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: categories.imageUrl,
        displayOrder: categories.displayOrder,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        coursesCount: sql<number>`(
          SELECT COUNT(*)::int FROM courses
          WHERE courses.category_id = ${categories.categoryId}
          AND courses.status = 'PUBLISHED'
        )`,
      })
      .from(categories)
      .where(and(eq(categories.isActive, true), eq(categories.isDeleted, false)))
      .orderBy(asc(categories.displayOrder), asc(categories.name))
      .limit(MAX_CATEGORIES);

    // Resolve image URLs to CDN
    const resolved = flat.map((c) => ({
      ...c,
      imageUrl: this.resolveImageUrl(c.imageUrl),
    }));

    // Build tree: group children under parents
    const parents = resolved.filter((c) => !c.parentCategoryId);
    const childMap = new Map<string, typeof resolved>();
    for (const c of resolved) {
      if (c.parentCategoryId) {
        const arr = childMap.get(c.parentCategoryId) || [];
        arr.push(c);
        childMap.set(c.parentCategoryId, arr);
      }
    }
    const result = parents.map((p) => ({
      ...p,
      children: childMap.get(p.categoryId) || [],
    }));

    await this.cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async findOne(id: string) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.categoryId, id), eq(categories.isDeleted, false)))
      .limit(1);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findBySlug(slug: string) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.isDeleted, false)))
      .limit(1);

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    // Get courses count
    const coursesCount = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(courses)
      .where(
        and(
          eq(courses.categoryId, category.categoryId),
          eq(courses.status, 'PUBLISHED'),
        ),
      );

    return {
      ...category,
      coursesCount: Number(coursesCount[0]?.count || 0),
    };
  }

  // ==================== ADMIN METHODS ====================

  async findAllAdmin(filters?: {
    search?: string;
    isActive?: boolean;
    parentCategoryId?: string;
    page?: number;
    limit?: number;
  }) {
    const limit = Math.min(filters?.limit || 50, MAX_CATEGORIES);
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    const conditions = [eq(categories.isDeleted, false)];

    if (filters?.search) {
      conditions.push(ilike(categories.name, `%${filters.search}%`));
    }

    if (typeof filters?.isActive === 'boolean') {
      conditions.push(eq(categories.isActive, filters.isActive));
    }

    if (filters?.parentCategoryId !== undefined) {
      if (filters.parentCategoryId === 'root') {
        conditions.push(sql`${categories.parentCategoryId} IS NULL`);
      } else {
        conditions.push(eq(categories.parentCategoryId, filters.parentCategoryId));
      }
    }

    const whereClause = and(...conditions);

    const [results, countResult] = await Promise.all([
      this.db
        .select({
          categoryId: categories.categoryId,
          parentCategoryId: categories.parentCategoryId,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          imageUrl: categories.imageUrl,
          isActive: categories.isActive,
          displayOrder: categories.displayOrder,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
          coursesCount: sql<number>`(
            SELECT COUNT(*)::int FROM courses
            WHERE courses.category_id = ${categories.categoryId}
          )`,
        })
        .from(categories)
        .where(whereClause)
        .orderBy(asc(categories.displayOrder), asc(categories.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(categories)
        .where(whereClause),
    ]);

    return {
      data: results.map((r) => ({ ...r, imageUrl: this.resolveImageUrl(r.imageUrl) })),
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count || 0),
        totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limit),
      },
    };
  }

  async create(dto: CreateCategoryDto) {
    await this.validateParent(dto.parentCategoryId);
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for active duplicates
    const [existing] = await this.db
      .select({ id: categories.categoryId })
      .from(categories)
      .where(
        and(
          eq(categories.isDeleted, false),
          sql`(LOWER(${categories.name}) = LOWER(${dto.name}) OR ${categories.slug} = ${slug})`,
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(
        'Category with this name or slug already exists',
      );
    }

    // Check if a soft-deleted category with the same slug exists — restore it
    const [softDeleted] = await this.db
      .select({ id: categories.categoryId })
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.isDeleted, true)))
      .limit(1);

    let category;
    if (softDeleted) {
      [category] = await this.db
        .update(categories)
        .set({
          name: dto.name,
          slug,
          description: dto.description || null,
          imageUrl: dto.imageUrl ?? null,
          isActive: dto.isActive ?? true,
          isDeleted: false,
          displayOrder: dto.displayOrder ?? 0,
          parentCategoryId: dto.parentCategoryId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(categories.categoryId, softDeleted.id))
        .returning();
    } else {
      [category] = await this.db
        .insert(categories)
        .values({
          name: dto.name,
          slug,
          description: dto.description || null,
          imageUrl: dto.imageUrl ?? null,
          isActive: dto.isActive ?? true,
          displayOrder: dto.displayOrder ?? 0,
          parentCategoryId: dto.parentCategoryId ?? null,
        })
        .returning();
    }

    await this.cacheService.delByPrefix('categories:');
    return category;
  }

  async update(categoryId: string, dto: UpdateCategoryDto) {
    if (dto.parentCategoryId !== undefined) {
      await this.validateParent(dto.parentCategoryId, categoryId);
      // If this category has children, prevent turning it into a subcategory
      if (dto.parentCategoryId) {
        const [hasChild] = await this.db
          .select({ id: categories.categoryId })
          .from(categories)
          .where(and(eq(categories.parentCategoryId, categoryId), eq(categories.isDeleted, false)))
          .limit(1);
        if (hasChild) {
          throw new BadRequestException(
            'Cannot move a parent category under another category while it still has subcategories',
          );
        }
      }
    }
    const existing = await this.findOne(categoryId);

    // Check for duplicate name/slug if changing
    if (dto.name || dto.slug) {
      const newSlug =
        dto.slug || (dto.name ? this.generateSlug(dto.name) : existing.slug);
      const newName = dto.name || existing.name;

      const [duplicate] = await this.db
        .select({ id: categories.categoryId })
        .from(categories)
        .where(
          and(
            eq(categories.isDeleted, false),
            sql`${categories.categoryId} != ${categoryId}`,
            sql`(LOWER(${categories.name}) = LOWER(${newName}) OR ${categories.slug} = ${newSlug})`,
          ),
        )
        .limit(1);

      if (duplicate) {
        throw new ConflictException(
          'Category with this name or slug already exists',
        );
      }
    }

    const updateData: Partial<typeof categories.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.name) {
      updateData.name = dto.name;
      if (!dto.slug) updateData.slug = this.generateSlug(dto.name);
    }
    if (dto.slug) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;
    if (dto.parentCategoryId !== undefined) updateData.parentCategoryId = dto.parentCategoryId;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;

    const [updated] = await this.db
      .update(categories)
      .set(updateData)
      .where(eq(categories.categoryId, categoryId))
      .returning();

    await this.cacheService.delByPrefix('categories:');
    return updated;
  }

  async activate(categoryId: string) {
    await this.findOne(categoryId);
    await this.db
      .update(categories)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(categories.categoryId, categoryId));
    await this.cacheService.delByPrefix('categories:');
    return { categoryId, isActive: true, message: 'Category activated' };
  }

  async deactivate(categoryId: string) {
    await this.findOne(categoryId);
    await this.db
      .update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(categories.categoryId, categoryId));
    await this.cacheService.delByPrefix('categories:');
    return { categoryId, isActive: false, message: 'Category deactivated' };
  }

  async softDelete(categoryId: string) {
    await this.findOne(categoryId);

    // Check if category has courses
    const [courseCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(courses)
      .where(eq(courses.categoryId, categoryId));

    // Soft delete - courses retain the reference but category won't show in listings
    await this.db
      .update(categories)
      .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
      .where(eq(categories.categoryId, categoryId));

    await this.cacheService.delByPrefix('categories:');
    return {
      categoryId,
      isDeleted: true,
      message: 'Category deleted',
      note:
        Number(courseCount?.count || 0) > 0
          ? `${courseCount.count} courses still reference this category`
          : undefined,
    };
  }
}
