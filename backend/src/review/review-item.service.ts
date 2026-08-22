import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  assessmentErrorNotebook,
  reviewItems,
  studentQuestionBookmarks,
} from '../database/schema';
import { JOB_QUEUE, JobQueue, registerAndRepeat } from '../jobs/job-queue';
import { SchedulerService } from './scheduler.service';

export const REVIEW_INGESTION_JOB = 'review.item.ingest';
const EVERY_HOUR = 60 * 60 * 1000;

@Injectable()
export class ReviewItemService implements OnModuleInit {
  private readonly logger = new Logger(ReviewItemService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly scheduler: SchedulerService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      REVIEW_INGESTION_JOB,
      async () => {
        await this.ingestErrorNotebook();
      },
      EVERY_HOUR,
      (err) => this.logger.error('Could not ingest error notebook', err),
    );
  }

  async addBookmark(userId: string, questionId: string): Promise<{ bookmarkId: string }> {
    const now = this.clock.now();

    const [existing] = await this.db
      .select()
      .from(studentQuestionBookmarks)
      .where(
        and(
          eq(studentQuestionBookmarks.userId, userId),
          eq(studentQuestionBookmarks.questionId, questionId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('Question already bookmarked');
    }

    const [bookmark] = await this.db
      .insert(studentQuestionBookmarks)
      .values({ userId, questionId, createdAt: now })
      .returning();

    const initial = this.scheduler.initialState(now);

    await this.db
      .insert(reviewItems)
      .values({
        userId,
        questionId,
        source: 'BOOKMARKED_QUESTION',
        sourceId: bookmark.bookmarkId,
        intervalDays: initial.intervalDays,
        easeFactor: initial.easeFactor,
        repetitionCount: initial.repetitionCount,
        lapseCount: initial.lapseCount,
        dueAt: initial.dueAt,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    return { bookmarkId: bookmark.bookmarkId };
  }

  async removeBookmark(userId: string, questionId: string): Promise<void> {
    const [removed] = await this.db
      .delete(studentQuestionBookmarks)
      .where(
        and(
          eq(studentQuestionBookmarks.userId, userId),
          eq(studentQuestionBookmarks.questionId, questionId),
        ),
      )
      .returning();

    if (!removed) {
      throw new NotFoundException('Bookmark not found');
    }

    const now = this.clock.now();
    await this.db
      .update(reviewItems)
      .set({ retiredAt: now, updatedAt: now })
      .where(
        and(
          eq(reviewItems.userId, userId),
          eq(reviewItems.questionId, questionId),
          eq(reviewItems.source, 'BOOKMARKED_QUESTION'),
          isNull(reviewItems.retiredAt),
        ),
      );
  }

  async ingestErrorNotebook(): Promise<void> {
    const now = this.clock.now();
    const initial = this.scheduler.initialState(now);

    const unresolved = await this.db
      .select()
      .from(assessmentErrorNotebook)
      .where(eq(assessmentErrorNotebook.isResolved, false));

    for (const entry of unresolved) {
      await this.db
        .insert(reviewItems)
        .values({
          userId: entry.userId,
          questionId: entry.questionId,
          source: 'ERROR_NOTEBOOK',
          sourceId: entry.entryId,
          intervalDays: initial.intervalDays,
          easeFactor: initial.easeFactor,
          repetitionCount: initial.repetitionCount,
          lapseCount: initial.lapseCount,
          dueAt: initial.dueAt,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    const resolved = await this.db
      .select()
      .from(assessmentErrorNotebook)
      .where(eq(assessmentErrorNotebook.isResolved, true));

    for (const entry of resolved) {
      await this.db
        .update(reviewItems)
        .set({ retiredAt: now, updatedAt: now })
        .where(
          and(
            eq(reviewItems.userId, entry.userId),
            eq(reviewItems.source, 'ERROR_NOTEBOOK'),
            eq(reviewItems.sourceId, entry.entryId),
            isNull(reviewItems.retiredAt),
          ),
        );
    }
  }
}
