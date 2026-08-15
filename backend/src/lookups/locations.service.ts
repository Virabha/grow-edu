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
import { locations } from '../database/schema';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FilterLookupsDto } from './dto/filter-lookups.dto';

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  return (err as { code: unknown }).code === '23505';
}

@Injectable()
export class LocationsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(filters: FilterLookupsDto) {
    const limit = Math.min(filters.limit ?? 20, 100);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const whereClause = filters.search
      ? ilike(locations.name, `%${filters.search}%`)
      : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(locations)
        .where(whereClause)
        .orderBy(asc(locations.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(locations)
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
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Location with id "${id}" not found`);
    }
    return row;
  }

  async create(dto: CreateLocationDto) {
    const [existing] = await this.db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.code, dto.code))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        `A location with code "${dto.code}" already exists`,
      );
    }

    try {
      const [created] = await this.db
        .insert(locations)
        .values({
          name: dto.name,
          code: dto.code,
          dialCode: dto.dialCode ?? null,
          currency: dto.currency ?? null,
          isActive: dto.isActive ?? true,
        })
        .returning();

      if (!created) throw new Error('Insert returned no row');
      return created;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `A location with code "${dto.code}" already exists`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateLocationDto) {
    const existing = await this.findOne(id);

    if (dto.code !== undefined && dto.code !== existing.code) {
      const [dup] = await this.db
        .select({ id: locations.id })
        .from(locations)
        .where(and(eq(locations.code, dto.code), ne(locations.id, id)))
        .limit(1);

      if (dup) {
        throw new ConflictException(
          `A location with code "${dto.code}" already exists`,
        );
      }
    }

    const set: Partial<Omit<typeof locations.$inferInsert, 'id' | 'createdAt'>> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) set.name = dto.name;
    if (dto.code !== undefined) set.code = dto.code;
    if (dto.dialCode !== undefined) set.dialCode = dto.dialCode;
    if (dto.currency !== undefined) set.currency = dto.currency;
    if (dto.isActive !== undefined) set.isActive = dto.isActive;

    try {
      const [updated] = await this.db
        .update(locations)
        .set(set)
        .where(eq(locations.id, id))
        .returning();

      if (!updated) throw new NotFoundException(`Location with id "${id}" not found`);
      return updated;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `A location with code "${dto.code ?? ''}" already exists`,
        );
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(locations).where(eq(locations.id, id));
    return { id, deleted: true as const };
  }
}
