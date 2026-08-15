import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SQL, and, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { blogCategories, blogPosts } from '../database/schema';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { ListBlogCategoriesDto } from './dto/list-blog-categories.dto';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { ListBlogPostsDto } from './dto/list-blog-posts.dto';
import { PublicListBlogPostsDto } from './dto/public-list-blog-posts.dto';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

type Db = PostgresJsDatabase<typeof schema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function paginationMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

@Injectable()
export class BlogService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Db) {}

  private async iterateSlug(
    base: string,
    isAvailable: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    if (await isAvailable(base)) return base;
    for (let n = 2; n <= 50; n++) {
      const candidate = `${base}-${n}`;
      if (await isAvailable(candidate)) return candidate;
    }
    return `${base}-${Date.now()}`;
  }

  private async uniqueSlugForCategory(base: string, excludeId?: string): Promise<string> {
    return this.iterateSlug(base, async (slug) => {
      const [row] = await this.db
        .select({ id: blogCategories.id })
        .from(blogCategories)
        .where(eq(blogCategories.slug, slug))
        .limit(1);
      return !row || row.id === excludeId;
    });
  }

  private async uniqueSlugForPost(base: string, excludeId?: string): Promise<string> {
    return this.iterateSlug(base, async (slug) => {
      const [row] = await this.db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug))
        .limit(1);
      return !row || row.id === excludeId;
    });
  }

  private async loadCategory(id: string) {
    const [row] = await this.db
      .select()
      .from(blogCategories)
      .where(and(eq(blogCategories.id, id), eq(blogCategories.isDeleted, false)))
      .limit(1);
    if (!row) throw new NotFoundException(`Blog category ${id} not found`);
    return row;
  }

  private async loadPost(id: string) {
    const [row] = await this.db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.id, id), eq(blogPosts.isDeleted, false)))
      .limit(1);
    if (!row) throw new NotFoundException(`Blog post ${id} not found`);
    return row;
  }

  async listCategories(query: ListBlogCategoriesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(blogCategories.isDeleted, false)];
    if (query.search) {
      conditions.push(ilike(blogCategories.name, `%${query.search}%`));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(blogCategories.isActive, query.isActive === 'true'));
    }

    const where = and(...conditions);

    const postCountSubq = sql<number>`(
      SELECT count(*)::int FROM blog_posts bp
      WHERE bp.category_id = ${blogCategories.id}
        AND bp.is_deleted = false
    )`;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: blogCategories.id,
          name: blogCategories.name,
          slug: blogCategories.slug,
          displayOrder: blogCategories.displayOrder,
          isActive: blogCategories.isActive,
          createdAt: blogCategories.createdAt,
          updatedAt: blogCategories.updatedAt,
          postCount: postCountSubq,
        })
        .from(blogCategories)
        .where(where)
        .orderBy(blogCategories.displayOrder, blogCategories.name)
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(blogCategories).where(where),
    ]);

    return {
      data: rows,
      pagination: paginationMeta(page, limit, Number(total)),
    };
  }

  async createCategory(dto: CreateBlogCategoryDto) {
    const base = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    if (dto.slug) {
      const [conflict] = await this.db
        .select({ id: blogCategories.id })
        .from(blogCategories)
        .where(eq(blogCategories.slug, base))
        .limit(1);
      if (conflict) {
        throw new ConflictException(`A blog category with slug "${base}" already exists`);
      }
    }

    const slug = dto.slug ? base : await this.uniqueSlugForCategory(base);

    const [row] = await this.db
      .insert(blogCategories)
      .values({
        name: dto.name,
        slug,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();
    return row;
  }

  async getCategory(id: string) {
    return this.loadCategory(id);
  }

  async updateCategory(id: string, dto: UpdateBlogCategoryDto) {
    const existing = await this.loadCategory(id);

    if (dto.slug !== undefined) {
      const normalized = slugify(dto.slug);
      if (normalized !== existing.slug) {
        const [conflict] = await this.db
          .select({ id: blogCategories.id })
          .from(blogCategories)
          .where(eq(blogCategories.slug, normalized))
          .limit(1);
        if (conflict && conflict.id !== id) {
          throw new ConflictException(`A blog category with slug "${normalized}" already exists`);
        }
      }
    }

    const [updated] = await this.db
      .update(blogCategories)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: slugify(dto.slug) }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(blogCategories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: string) {
    await this.loadCategory(id);

    const [{ postCount }] = await this.db
      .select({ postCount: count() })
      .from(blogPosts)
      .where(and(eq(blogPosts.categoryId, id), eq(blogPosts.isDeleted, false)));

    if (Number(postCount) > 0) {
      throw new ConflictException(
        `Cannot delete category: it still has ${postCount} active post(s). Reassign or delete those posts first.`,
      );
    }

    await this.db
      .update(blogCategories)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(blogCategories.id, id));

    return { deleted: true, id };
  }

  async listPosts(query: ListBlogPostsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(blogPosts.isDeleted, false)];
    if (query.search) {
      conditions.push(ilike(blogPosts.title, `%${query.search}%`));
    }
    if (query.status) {
      conditions.push(eq(blogPosts.status, query.status));
    }

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          categoryId: blogPosts.categoryId,
          categoryName: blogCategories.name,
          authorName: blogPosts.authorName,
          status: blogPosts.status,
          views: blogPosts.viewCount,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
        })
        .from(blogPosts)
        .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
        .where(where)
        .orderBy(desc(blogPosts.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(blogPosts).where(where),
    ]);

    return {
      data: rows,
      pagination: paginationMeta(page, limit, Number(total)),
    };
  }

  async createPost(dto: CreateBlogPostDto) {
    const base = dto.slug ? slugify(dto.slug) : slugify(dto.title);

    if (dto.slug) {
      const [conflict] = await this.db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.slug, base))
        .limit(1);
      if (conflict) {
        throw new ConflictException(`A blog post with slug "${base}" already exists`);
      }
    }

    const slug = dto.slug ? base : await this.uniqueSlugForPost(base);

    const publishedAt =
      dto.status === 'PUBLISHED' ? new Date() : null;

    const [row] = await this.db
      .insert(blogPosts)
      .values({
        categoryId: dto.categoryId ?? null,
        title: dto.title,
        slug,
        excerpt: dto.excerpt ?? null,
        content: dto.content,
        coverImageUrl: dto.coverImageUrl ?? null,
        authorName: dto.authorName ?? null,
        status: dto.status ?? 'DRAFT',
        tags: dto.tags ?? [],
        publishedAt,
      })
      .returning();
    return row;
  }

  async getPost(id: string) {
    const [row] = await this.db
      .select({
        id: blogPosts.id,
        categoryId: blogPosts.categoryId,
        categoryName: blogCategories.name,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        content: blogPosts.content,
        coverImageUrl: blogPosts.coverImageUrl,
        authorName: blogPosts.authorName,
        authorUserId: blogPosts.authorUserId,
        status: blogPosts.status,
        tags: blogPosts.tags,
        views: blogPosts.viewCount,
        publishedAt: blogPosts.publishedAt,
        isDeleted: blogPosts.isDeleted,
        createdAt: blogPosts.createdAt,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
      .where(and(eq(blogPosts.id, id), eq(blogPosts.isDeleted, false)))
      .limit(1);
    if (!row) throw new NotFoundException(`Blog post ${id} not found`);
    return row;
  }

  async updatePost(id: string, dto: UpdateBlogPostDto) {
    const existing = await this.loadPost(id);

    if (dto.slug !== undefined) {
      const normalized = slugify(dto.slug);
      if (normalized !== existing.slug) {
        const [conflict] = await this.db
          .select({ id: blogPosts.id })
          .from(blogPosts)
          .where(eq(blogPosts.slug, normalized))
          .limit(1);
        if (conflict && conflict.id !== id) {
          throw new ConflictException(`A blog post with slug "${normalized}" already exists`);
        }
      }
    }

    const goingLive = dto.status === 'PUBLISHED' && existing.publishedAt === null;

    const [updated] = await this.db
      .update(blogPosts)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: slugify(dto.slug) }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.authorName !== undefined && { authorName: dto.authorName }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(goingLive && { publishedAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  async deletePost(id: string) {
    await this.loadPost(id);
    await this.db
      .update(blogPosts)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(blogPosts.id, id));
    return { deleted: true, id };
  }

  async listPublicPosts(query: PublicListBlogPostsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      eq(blogPosts.isDeleted, false),
      eq(blogPosts.status, 'PUBLISHED'),
    ];

    if (query.categorySlug) {
      const [cat] = await this.db
        .select({ id: blogCategories.id })
        .from(blogCategories)
        .where(
          and(
            eq(blogCategories.slug, query.categorySlug),
            eq(blogCategories.isDeleted, false),
          ),
        )
        .limit(1);
      if (!cat) {
        return { data: [], pagination: paginationMeta(page, limit, 0) };
      }
      conditions.push(eq(blogPosts.categoryId, cat.id));
    }

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          coverImageUrl: blogPosts.coverImageUrl,
          authorName: blogPosts.authorName,
          tags: blogPosts.tags,
          views: blogPosts.viewCount,
          publishedAt: blogPosts.publishedAt,
          categoryId: blogPosts.categoryId,
          categoryName: blogCategories.name,
        })
        .from(blogPosts)
        .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
        .where(where)
        .orderBy(desc(blogPosts.publishedAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(blogPosts).where(where),
    ]);

    return {
      data: rows,
      pagination: paginationMeta(page, limit, Number(total)),
    };
  }

  async getPublicPostBySlug(slug: string) {
    const [row] = await this.db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        content: blogPosts.content,
        coverImageUrl: blogPosts.coverImageUrl,
        authorName: blogPosts.authorName,
        tags: blogPosts.tags,
        views: blogPosts.viewCount,
        publishedAt: blogPosts.publishedAt,
        categoryId: blogPosts.categoryId,
        categoryName: blogCategories.name,
      })
      .from(blogPosts)
      .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
      .where(
        and(
          eq(blogPosts.slug, slug),
          eq(blogPosts.status, 'PUBLISHED'),
          eq(blogPosts.isDeleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException(`Blog post "${slug}" not found`);

    await this.db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(eq(blogPosts.id, row.id));

    return { ...row, views: row.views + 1 };
  }
}
