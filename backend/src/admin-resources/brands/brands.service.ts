import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, ilike, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';
import { brands } from '../../database/schema';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(filters: { search?: string; page?: number; limit?: number } = {}) {
    const limit = Math.min(filters.limit ?? 20, 100);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const whereClause = filters.search
      ? ilike(brands.name, `%${filters.search}%`)
      : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(brands)
        .where(whereClause)
        .orderBy(asc(brands.displayOrder), asc(brands.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(brands)
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
      .from(brands)
      .where(eq(brands.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Brand with id "${id}" not found`);
    }
    return row;
  }

  async create(dto: CreateBrandDto) {
    const [created] = await this.db
      .insert(brands)
      .values({
        name: dto.name,
        logoUrl: dto.logoUrl ?? null,
        websiteUrl: dto.websiteUrl ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw new Error('Insert returned no row');
    }
    return created;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);

    const set: Partial<Omit<typeof brands.$inferInsert, 'id' | 'createdAt'>> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) set.name = dto.name;
    if (dto.logoUrl !== undefined) set.logoUrl = dto.logoUrl;
    if (dto.websiteUrl !== undefined) set.websiteUrl = dto.websiteUrl;
    if (dto.displayOrder !== undefined) set.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) set.isActive = dto.isActive;

    const [updated] = await this.db
      .update(brands)
      .set(set)
      .where(eq(brands.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Brand with id "${id}" not found`);
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(brands).where(eq(brands.id, id));
    return { id, deleted: true };
  }
}
