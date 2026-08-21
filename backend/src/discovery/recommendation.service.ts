import { Inject, Injectable } from '@nestjs/common';
import { LISTED_STATUSES, PUBLIC_BATCH_COLUMNS } from './public-batch';
import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { batches, batchEnrollments, studentProfiles } from '../database/schema';
import type { CatalogueBatch } from './dto/catalogue-batch.dto';


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
        .select(PUBLIC_BATCH_COLUMNS)
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

    if (!profile.level) {
      const rows = await this.db
        .select(PUBLIC_BATCH_COLUMNS)
        .from(batches)
        .where(and(...goalConditions))
        .orderBy(asc(batches.startDate), asc(batches.batchId))
        .limit(10);
      return rows as CatalogueBatch[];
    }

    const levelRank = sql<number>`case when ${batches.levelKey} = ${profile.level} then 0 else 1 end`;

    const ranked = await this.db
      .select({ ...PUBLIC_BATCH_COLUMNS, levelRank })
      .from(batches)
      .where(and(...goalConditions))
      .orderBy(levelRank, asc(batches.startDate), asc(batches.batchId))
      .limit(10);

    return ranked.map(
      ({ levelRank: _rank, ...batch }) => batch,
    ) as CatalogueBatch[];
  }
}
