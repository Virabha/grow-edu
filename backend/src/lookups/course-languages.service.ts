import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, ilike, ne, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { courseLanguages } from '../database/schema';
import { CreateCourseLanguageDto } from './dto/create-course-language.dto';
import { UpdateCourseLanguageDto } from './dto/update-course-language.dto';
import { FilterLookupsDto } from './dto/filter-lookups.dto';

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  return (err as { code: unknown }).code === '23505';
}

@Injectable()
export class CourseLanguagesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(filters: FilterLookupsDto) {
    const limit = Math.min(filters.limit ?? 20, 100);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const whereClause = filters.search
      ? ilike(courseLanguages.name, `%${filters.search}%`)
      : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(courseLanguages)
        .where(whereClause)
        .orderBy(asc(courseLanguages.displayOrder), asc(courseLanguages.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseLanguages)
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
      .from(courseLanguages)
      .where(eq(courseLanguages.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Course language with id "${id}" not found`);
    }
    return row;
  }

  async create(dto: CreateCourseLanguageDto) {
    const [existing] = await this.db
      .select({ id: courseLanguages.id })
      .from(courseLanguages)
      .where(eq(courseLanguages.code, dto.code))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        `A course language with code "${dto.code}" already exists`,
      );
    }

    try {
      const [created] = await this.db
        .insert(courseLanguages)
        .values({
          name: dto.name,
          code: dto.code,
          displayOrder: dto.displayOrder ?? 0,
          isActive: dto.isActive ?? true,
        })
        .returning();

      if (!created) throw new Error('Insert returned no row');
      return created;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `A course language with code "${dto.code}" already exists`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCourseLanguageDto) {
    const existing = await this.findOne(id);

    if (dto.code !== undefined && dto.code !== existing.code) {
      const [dup] = await this.db
        .select({ id: courseLanguages.id })
        .from(courseLanguages)
        .where(and(eq(courseLanguages.code, dto.code), ne(courseLanguages.id, id)))
        .limit(1);

      if (dup) {
        throw new ConflictException(
          `A course language with code "${dto.code}" already exists`,
        );
      }
    }

    const set: Partial<Omit<typeof courseLanguages.$inferInsert, 'id' | 'createdAt'>> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) set.name = dto.name;
    if (dto.code !== undefined) set.code = dto.code;
    if (dto.displayOrder !== undefined) set.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) set.isActive = dto.isActive;

    try {
      const [updated] = await this.db
        .update(courseLanguages)
        .set(set)
        .where(eq(courseLanguages.id, id))
        .returning();

      if (!updated) throw new NotFoundException(`Course language with id "${id}" not found`);
      return updated;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `A course language with code "${dto.code ?? ''}" already exists`,
        );
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(courseLanguages).where(eq(courseLanguages.id, id));
    return { id, deleted: true as const };
  }
}
