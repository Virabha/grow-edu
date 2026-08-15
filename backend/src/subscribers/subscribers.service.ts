import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, ilike, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { newsletterSubscribers } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { FilterSubscribersDto } from './dto/filter-subscribers.dto';

// [Q] The newsletterSubscribers table has no `source` column; the admin page
//     declares it. Return null until the column is added to the schema.
// [Q] The newsletterSubscribers table has no `lastEmailAt` column; return null.

@Injectable()
export class SubscribersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /** Map a DB row to the ResourcePage response shape. */
  private toResponse(row: typeof newsletterSubscribers.$inferSelect) {
    return {
      id: row.id,
      email: row.email,
      // [Q] `source` column missing from newsletterSubscribers — not yet in schema
      source: null as null,
      // [Q] `lastEmailAt` column missing from newsletterSubscribers — not yet in schema
      lastEmailAt: null as null,
      subscribedAt: row.subscribedAt,
      isActive: row.isActive,
    };
  }

  async findAll(query: FilterSubscribersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];

    if (query.search) {
      conditions.push(ilike(newsletterSubscribers.email, `%${query.search}%`));
    }
    if (query.isActive !== undefined) {
      conditions.push(
        eq(newsletterSubscribers.isActive, query.isActive === 'true'),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(newsletterSubscribers)
        .where(where)
        .orderBy(newsletterSubscribers.subscribedAt)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(newsletterSubscribers)
        .where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select()
      .from(newsletterSubscribers)
      .where(sql`${newsletterSubscribers.id} = ${id}`)
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Subscriber ${id} not found`);
    }

    return this.toResponse(row);
  }

  async create(dto: CreateSubscriberDto) {
    // Return 409 on duplicate email (not a raw Postgres error)
    const [existing] = await this.db
      .select({ id: newsletterSubscribers.id })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, dto.email))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        `A subscriber with email "${dto.email}" already exists`,
      );
    }

    const [row] = await this.db
      .insert(newsletterSubscribers)
      .values({
        email: dto.email,
        isActive: dto.isActive ?? true,
      })
      .returning();

    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateSubscriberDto) {
    await this.findOne(id);

    if (dto.email !== undefined) {
      // Check for email collision with another subscriber
      const [conflict] = await this.db
        .select({ id: newsletterSubscribers.id })
        .from(newsletterSubscribers)
        .where(
          and(
            eq(newsletterSubscribers.email, dto.email),
            sql`${newsletterSubscribers.id} != ${id}`,
          ),
        )
        .limit(1);

      if (conflict) {
        throw new ConflictException(
          `A subscriber with email "${dto.email}" already exists`,
        );
      }
    }

    const [row] = await this.db
      .update(newsletterSubscribers)
      .set({
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      })
      .where(sql`${newsletterSubscribers.id} = ${id}`)
      .returning();

    return this.toResponse(row);
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.db
      .delete(newsletterSubscribers)
      .where(sql`${newsletterSubscribers.id} = ${id}`);

    return { id, deleted: true };
  }
}
