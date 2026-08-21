import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, notInArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { batches, batchEnrollments, studentProfiles } from '../database/schema';
import type { CatalogueBatch } from './dto/catalogue-batch.dto';

const LISTED_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;

const PUBLIC_COLUMNS = {
  batchId: batches.batchId,
  title: batches.title,
  slug: batches.slug,
  shortDescription: batches.shortDescription,
  thumbnail: batches.thumbnail,
  price: batches.price,
  currency: batches.currency,
  language: batches.language,
  goalKey: batches.goalKey,
  deliveryMode: batches.deliveryMode,
  startDate: batches.startDate,
  endDate: batches.endDate,
  status: batches.status,
  categoryId: batches.categoryId,
} as const;

@Injectable()
export class RecommendationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async forUser(userId: string): Promise<CatalogueBatch[]> {
    const [profile] = await this.db
      .select({ goalKey: studentProfiles.goalKey, level: studentProfiles.level })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);

    const enrolledRows = await this.db
      .select({ batchId: batchEnrollments.batchId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, 'ACTIVE'),
        ),
      );
    const enrolledIds = enrolledRows.map((r) => r.batchId);

    const baseConditions = [
      eq(batches.isDeleted, false),
      eq(batches.visibility, 'PUBLIC'),
      inArray(batches.status, [...LISTED_STATUSES]),
    ];

    if (enrolledIds.length > 0) {
      baseConditions.push(notInArray(batches.batchId, enrolledIds));
    }

    if (!profile?.goalKey) {
      const rows = await this.db
        .select(PUBLIC_COLUMNS)
        .from(batches)
        .where(and(...baseConditions))
        .orderBy(asc(batches.startDate), asc(batches.batchId))
        .limit(10);
      return rows as CatalogueBatch[];
    }

    const goalConditions = [
      ...baseConditions,
      eq(batches.goalKey, profile.goalKey),
    ];
    const rows = await this.db
      .select(PUBLIC_COLUMNS)
      .from(batches)
      .where(and(...goalConditions))
      .orderBy(asc(batches.startDate), asc(batches.batchId))
      .limit(10);

    return rows as CatalogueBatch[];
  }
}
