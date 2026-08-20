import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { and, count, desc, eq, inArray, sql, sum } from 'drizzle-orm';
import { FilesService } from '../files/files.service';

const MAX_PAGE_LIMIT = 100;

@Injectable()
export class InstructorService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly filesService: FilesService,
  ) {}

  private ensureThumbnailUrl(thumbnail: string | null): string | null {
    if (!thumbnail) return null;
    if (thumbnail.startsWith('http')) return thumbnail;
    return this.filesService.getDownloadUrl(thumbnail);
  }

  private async assignedBatchIds(instructorId: string): Promise<string[]> {
    const rows = await this.db
      .select({ batchId: schema.batchInstructors.batchId })
      .from(schema.batchInstructors)
      .where(eq(schema.batchInstructors.instructorId, instructorId));
    return rows.map((r) => r.batchId);
  }

  async getDashboardStats(instructorId: string) {
    const batchIds = await this.assignedBatchIds(instructorId);

    if (batchIds.length === 0) {
      return {
        totalBatches: 0,
        totalStudents: 0,
        totalRevenue: 0,
        recentBatches: [],
      };
    }

    const [[students], [revenue], recentBatches] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(schema.batchEnrollments)
        .where(
          and(
            inArray(schema.batchEnrollments.batchId, batchIds),
            eq(schema.batchEnrollments.status, 'ACTIVE'),
          ),
        ),
      this.db
        .select({ total: sum(schema.payments.amount) })
        .from(schema.payments)
        .where(
          and(
            inArray(schema.payments.batchId, batchIds),
            eq(schema.payments.status, 'COMPLETED'),
          ),
        ),
      this.db
        .select({
          batch: schema.batches,
          enrollmentCount: sql<number>`(
            select count(*)::int from batch_enrollments be
            where be.batch_id = ${schema.batches.batchId}
              and be.status = 'ACTIVE'
          )`,
        })
        .from(schema.batches)
        .where(
          and(
            inArray(schema.batches.batchId, batchIds),
            eq(schema.batches.isDeleted, false),
          ),
        )
        .orderBy(desc(schema.batches.createdAt))
        .limit(5),
    ]);

    return {
      totalBatches: batchIds.length,
      totalStudents: students.count,
      totalRevenue: revenue.total ? parseFloat(revenue.total) : 0,
      recentBatches: recentBatches.map((r) => ({
        ...r.batch,
        thumbnail: this.ensureThumbnailUrl(r.batch.thumbnail),
        enrollmentCount: Number(r.enrollmentCount),
      })),
    };
  }

  async getInstructorBatches(instructorId: string, page = 1, limit = 10) {
    const effectiveLimit = Math.min(limit, MAX_PAGE_LIMIT);
    const offset = (page - 1) * effectiveLimit;
    const batchIds = await this.assignedBatchIds(instructorId);

    if (batchIds.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit: effectiveLimit, totalPages: 0 },
      };
    }

    const where = and(
      inArray(schema.batches.batchId, batchIds),
      eq(schema.batches.isDeleted, false),
    );

    const [rows, [total]] = await Promise.all([
      this.db
        .select({
          batch: schema.batches,
          role: schema.batchInstructors.role,
          enrollmentCount: sql<number>`(
            select count(*)::int from batch_enrollments be
            where be.batch_id = ${schema.batches.batchId}
              and be.status = 'ACTIVE'
          )`,
        })
        .from(schema.batches)
        .innerJoin(
          schema.batchInstructors,
          and(
            eq(schema.batchInstructors.batchId, schema.batches.batchId),
            eq(schema.batchInstructors.instructorId, instructorId),
          ),
        )
        .where(where)
        .orderBy(desc(schema.batches.createdAt))
        .limit(effectiveLimit)
        .offset(offset),
      this.db.select({ count: count() }).from(schema.batches).where(where),
    ]);

    return {
      data: rows.map((r) => ({
        ...r.batch,
        thumbnail: this.ensureThumbnailUrl(r.batch.thumbnail),
        myRole: r.role,
        enrollmentCount: Number(r.enrollmentCount),
      })),
      meta: {
        total: total.count,
        page,
        limit: effectiveLimit,
        totalPages: Math.ceil(total.count / effectiveLimit),
      },
    };
  }
}
