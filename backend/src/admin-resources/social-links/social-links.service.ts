import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, ilike, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';
import { socialLinks } from '../../database/schema';
import { CreateSocialLinkDto } from './dto/create-social-link.dto';
import { UpdateSocialLinkDto } from './dto/update-social-link.dto';

@Injectable()
export class SocialLinksService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(filters: { search?: string; page?: number; limit?: number } = {}) {
    const limit = Math.min(filters.limit ?? 20, 100);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const whereClause = filters.search
      ? ilike(socialLinks.platform, `%${filters.search}%`)
      : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(socialLinks)
        .where(whereClause)
        .orderBy(asc(socialLinks.displayOrder), asc(socialLinks.platform))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(socialLinks)
        .where(whereClause),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select()
      .from(socialLinks)
      .where(eq(socialLinks.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Social link with id "${id}" not found`);
    }
    return row;
  }

  async create(dto: CreateSocialLinkDto) {
    const [created] = await this.db
      .insert(socialLinks)
      .values({
        platform: dto.platform,
        url: dto.url ?? null,
        icon: dto.icon ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw new Error('Insert returned no row');
    }
    return created;
  }

  async update(id: string, dto: UpdateSocialLinkDto) {
    await this.findOne(id);

    const set: Partial<Omit<typeof socialLinks.$inferInsert, 'id' | 'createdAt'>> = {
      updatedAt: new Date(),
    };
    if (dto.platform !== undefined) set.platform = dto.platform;
    if (dto.url !== undefined) set.url = dto.url;
    if (dto.icon !== undefined) set.icon = dto.icon;
    if (dto.displayOrder !== undefined) set.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) set.isActive = dto.isActive;

    const [updated] = await this.db
      .update(socialLinks)
      .set(set)
      .where(eq(socialLinks.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Social link with id "${id}" not found`);
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(socialLinks).where(eq(socialLinks.id, id));
    return { id, deleted: true };
  }
}
