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
import { currencies } from '../database/schema';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { FilterLookupsDto } from './dto/filter-lookups.dto';

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  return (err as { code: unknown }).code === '23505';
}

/** Drizzle returns `decimal` columns as strings. Convert so the UI's number input works. */
function toResponseRow(row: typeof currencies.$inferSelect) {
  return { ...row, rate: Number(row.rate) };
}

@Injectable()
export class CurrenciesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(filters: FilterLookupsDto) {
    const limit = Math.min(filters.limit ?? 20, 100);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const whereClause = filters.search
      ? ilike(currencies.name, `%${filters.search}%`)
      : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(currencies)
        .where(whereClause)
        .orderBy(asc(currencies.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(currencies)
        .where(whereClause),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows.map(toResponseRow),
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
      .from(currencies)
      .where(eq(currencies.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Currency with id "${id}" not found`);
    }
    return toResponseRow(row);
  }

  async create(dto: CreateCurrencyDto) {
    const [existing] = await this.db
      .select({ id: currencies.id })
      .from(currencies)
      .where(eq(currencies.code, dto.code))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        `A currency with code "${dto.code}" already exists`,
      );
    }

    try {
      const [created] = await this.db
        .insert(currencies)
        .values({
          name: dto.name,
          code: dto.code,
          symbol: dto.symbol,
          rate: String(dto.rate),
          position: dto.position ?? 'before',
          isActive: dto.isActive ?? true,
        })
        .returning();

      if (!created) throw new Error('Insert returned no row');
      return toResponseRow(created);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `A currency with code "${dto.code}" already exists`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCurrencyDto) {
    const existing = await this.findOne(id);

    if (dto.code !== undefined && dto.code !== existing.code) {
      const [dup] = await this.db
        .select({ id: currencies.id })
        .from(currencies)
        .where(and(eq(currencies.code, dto.code), ne(currencies.id, id)))
        .limit(1);

      if (dup) {
        throw new ConflictException(
          `A currency with code "${dto.code}" already exists`,
        );
      }
    }

    const set: Partial<Omit<typeof currencies.$inferInsert, 'id' | 'createdAt'>> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) set.name = dto.name;
    if (dto.code !== undefined) set.code = dto.code;
    if (dto.symbol !== undefined) set.symbol = dto.symbol;
    if (dto.rate !== undefined) set.rate = String(dto.rate);
    if (dto.position !== undefined) set.position = dto.position;
    if (dto.isActive !== undefined) set.isActive = dto.isActive;

    try {
      const [updated] = await this.db
        .update(currencies)
        .set(set)
        .where(eq(currencies.id, id))
        .returning();

      if (!updated) throw new NotFoundException(`Currency with id "${id}" not found`);
      return toResponseRow(updated);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `A currency with code "${dto.code ?? ''}" already exists`,
        );
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(currencies).where(eq(currencies.id, id));
    return { id, deleted: true as const };
  }
}
