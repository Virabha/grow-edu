import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, ilike, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { withdrawMethods } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CreateWithdrawMethodDto } from './dto/create-withdraw-method.dto';
import { UpdateWithdrawMethodDto } from './dto/update-withdraw-method.dto';
import { FilterWithdrawMethodsDto } from './dto/filter-withdraw-methods.dto';

@Injectable()
export class WithdrawMethodsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /** Map a DB row to the ResourcePage response shape. */
  private toResponse(row: typeof withdrawMethods.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      // decimal columns come back as strings — convert so number inputs work
      minAmount: Number(row.minAmount),
      maxAmount: row.maxAmount !== null ? Number(row.maxAmount) : null,
      processingDays: row.processingDays,
      feePercent: row.feePercent !== null ? Number(row.feePercent) : null,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(query: FilterWithdrawMethodsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const where = query.search
      ? ilike(withdrawMethods.name, `%${query.search}%`)
      : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(withdrawMethods)
        .where(where)
        .orderBy(withdrawMethods.createdAt)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(withdrawMethods)
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
      .from(withdrawMethods)
      .where(sql`${withdrawMethods.id} = ${id}`)
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Withdraw method ${id} not found`);
    }

    return this.toResponse(row);
  }

  async create(dto: CreateWithdrawMethodDto) {
    // No unique constraint on name, but prevent duplicates as a UX guard
    const [existing] = await this.db
      .select({ id: withdrawMethods.id })
      .from(withdrawMethods)
      .where(ilike(withdrawMethods.name, dto.name))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        `A withdraw method named "${dto.name}" already exists`,
      );
    }

    const [row] = await this.db
      .insert(withdrawMethods)
      .values({
        name: dto.name,
        description: dto.description ?? null,
        minAmount: String(dto.minAmount),
        maxAmount: dto.maxAmount !== undefined ? String(dto.maxAmount) : null,
        processingDays: dto.processingDays ?? null,
        feePercent: dto.feePercent !== undefined ? String(dto.feePercent) : null,
        isActive: dto.isActive ?? true,
      })
      .returning();

    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateWithdrawMethodDto) {
    await this.findOne(id);

    const [row] = await this.db
      .update(withdrawMethods)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.minAmount !== undefined && { minAmount: String(dto.minAmount) }),
        ...(dto.maxAmount !== undefined && { maxAmount: dto.maxAmount !== null ? String(dto.maxAmount) : null }),
        ...(dto.processingDays !== undefined && { processingDays: dto.processingDays }),
        ...(dto.feePercent !== undefined && { feePercent: dto.feePercent !== null ? String(dto.feePercent) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(sql`${withdrawMethods.id} = ${id}`)
      .returning();

    return this.toResponse(row);
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.db
      .delete(withdrawMethods)
      .where(sql`${withdrawMethods.id} = ${id}`);

    return { id, deleted: true };
  }
}
