import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  batches,
  instructorProfiles,
  searchDocuments,
  users,
} from '../database/schema';
import { JOB_QUEUE, JobQueue, registerAndRepeat } from '../jobs/job-queue';

const SYNC_JOB = 'discovery.search.sync';
const SYNC_INTERVAL_MS = 60_000;

const LISTED_STATUSES = new Set(['UPCOMING', 'ONGOING', 'COMPLETED']);

@Injectable()
export class SearchSyncService implements OnModuleInit {
  private readonly logger = new Logger(SearchSyncService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      SYNC_JOB,
      async () => { await this.syncAll(); },
      SYNC_INTERVAL_MS,
      (err) => this.logger.error('Search sync job failed', err),
    );
  }

  async syncAll(): Promise<void> {
    await this.syncBatches();
    await this.syncInstructors();
  }

  private async syncBatches(): Promise<void> {
    const now = this.clock.now();
    const rows = await this.db
      .select({
        batchId: batches.batchId,
        title: batches.title,
        description: batches.description,
        status: batches.status,
        isDeleted: batches.isDeleted,
        visibility: batches.visibility,
      })
      .from(batches);

    for (const row of rows) {
      const isListed =
        !row.isDeleted &&
        row.visibility === 'PUBLIC' &&
        LISTED_STATUSES.has(row.status);
      await this.db
        .insert(searchDocuments)
        .values({
          kind: 'BATCH',
          referenceId: row.batchId,
          title: row.title,
          body: row.description ?? '',
          isListed,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [searchDocuments.kind, searchDocuments.referenceId],
          set: {
            title: row.title,
            body: row.description ?? '',
            isListed,
            updatedAt: now,
          },
        });
    }
  }

  private async syncInstructors(): Promise<void> {
    const now = this.clock.now();
    const rows = await this.db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        bio: instructorProfiles.bio,
        isActive: instructorProfiles.isActive,
      })
      .from(instructorProfiles)
      .innerJoin(users, eq(users.userId, instructorProfiles.userId));

    for (const row of rows) {
      const parts = [row.firstName, row.lastName].filter(
        (p): p is string => typeof p === 'string' && p.length > 0,
      );
      const title = parts.length > 0 ? parts.join(' ') : row.userId;
      await this.db
        .insert(searchDocuments)
        .values({
          kind: 'INSTRUCTOR',
          referenceId: row.userId,
          title,
          body: row.bio ?? '',
          isListed: row.isActive,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [searchDocuments.kind, searchDocuments.referenceId],
          set: {
            title,
            body: row.bio ?? '',
            isListed: row.isActive,
            updatedAt: now,
          },
        });
    }
  }
}
