import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, ilike, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';
import { instructorBadges } from '../../database/schema';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';

@Injectable()
export class BadgesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(filters: { search?: string; page?: number; limit?: number } = {}) {
    const limit = Math.min(filters.limit ?? 20, 100);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const whereClause = filters.search
      ? ilike(instructorBadges.name, `%${filters.search}%`)
      : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(instructorBadges)
        .where(whereClause)
        .orderBy(asc(instructorBadges.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(instructorBadges)
        .where(whereClause),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows.map((row) => ({ ...row, awardedCount: 0 })),
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
      .from(instructorBadges)
      .where(eq(instructorBadges.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Badge with id "${id}" not found`);
    }
    return { ...row, awardedCount: 0 };
  }

  async create(dto: CreateBadgeDto) {
    const [created] = await this.db
      .insert(instructorBadges)
      .values({
        name: dto.name,
        description: dto.description,
        icon: dto.icon ?? null,
        colour: dto.colour ?? null,
        criteriaType: dto.criteriaType,
        criteriaValue: dto.criteriaValue ?? null,
        isActive: dto.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw new Error('Insert returned no row');
    }
    return { ...created, awardedCount: 0 };
  }

  async update(id: string, dto: UpdateBadgeDto) {
    await this.findOne(id);

    const set: Partial<Omit<typeof instructorBadges.$inferInsert, 'id' | 'createdAt'>> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) set.name = dto.name;
    if (dto.description !== undefined) set.description = dto.description;
    if (dto.icon !== undefined) set.icon = dto.icon;
    if (dto.colour !== undefined) set.colour = dto.colour;
    if (dto.criteriaType !== undefined) set.criteriaType = dto.criteriaType;
    if (dto.criteriaValue !== undefined) set.criteriaValue = dto.criteriaValue;
    if (dto.isActive !== undefined) set.isActive = dto.isActive;

    const [updated] = await this.db
      .update(instructorBadges)
      .set(set)
      .where(eq(instructorBadges.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Badge with id "${id}" not found`);
    }
    return { ...updated, awardedCount: 0 };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(instructorBadges).where(eq(instructorBadges.id, id));
    return { id, deleted: true };
  }
}
