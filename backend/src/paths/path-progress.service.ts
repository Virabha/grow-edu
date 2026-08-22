import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { pathEnrolments, pathStagePrerequisites, pathStageProgress } from '../database/schema';

@Injectable()
export class PathProgressService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async myProgress(pathId: string, userId: string) {
    await this.requireEnrolment(pathId, userId);
    return this.db
      .select()
      .from(pathStageProgress)
      .where(and(
        eq(pathStageProgress.pathId, pathId),
        eq(pathStageProgress.userId, userId),
      ));
  }

  async completeStage(pathId: string, stageId: string, userId: string) {
    await this.requireEnrolment(pathId, userId);

    const now = this.clock.now();

    const [progress] = await this.db
      .select()
      .from(pathStageProgress)
      .where(and(
        eq(pathStageProgress.pathId, pathId),
        eq(pathStageProgress.stageId, stageId),
        eq(pathStageProgress.userId, userId),
      ))
      .limit(1);

    if (!progress) {
      throw new NotFoundException({ code: 'STAGE_NOT_FOUND', message: 'Stage progress not found' });
    }

    if (progress.state === 'LOCKED') {
      throw new ForbiddenException({ code: 'STAGE_LOCKED', message: 'Stage is locked. Complete prerequisites first.' });
    }

    if (progress.state !== 'COMPLETE') {
      await this.db
        .update(pathStageProgress)
        .set({ state: 'COMPLETE', completedAt: now, updatedAt: now })
        .where(and(
          eq(pathStageProgress.pathId, pathId),
          eq(pathStageProgress.stageId, stageId),
          eq(pathStageProgress.userId, userId),
        ));
    }

    await this.unlockDependents(pathId, stageId, userId, now);

    return { completed: true };
  }

  async allStudentsProgress(pathId: string) {
    return this.db
      .select()
      .from(pathStageProgress)
      .where(eq(pathStageProgress.pathId, pathId));
  }

  private async unlockDependents(pathId: string, stageId: string, userId: string, now: Date) {
    const dependents = await this.db
      .select({ stageId: pathStagePrerequisites.stageId })
      .from(pathStagePrerequisites)
      .where(and(
        eq(pathStagePrerequisites.pathId, pathId),
        eq(pathStagePrerequisites.requiredStageId, stageId),
      ));

    for (const dep of dependents) {
      const allComplete = await this.allPrereqsComplete(pathId, dep.stageId, userId);
      if (allComplete) {
        await this.db
          .update(pathStageProgress)
          .set({ state: 'OPEN', openedAt: now, updatedAt: now })
          .where(and(
            eq(pathStageProgress.pathId, pathId),
            eq(pathStageProgress.stageId, dep.stageId),
            eq(pathStageProgress.userId, userId),
            eq(pathStageProgress.state, 'LOCKED'),
          ));
      }
    }
  }

  private async allPrereqsComplete(pathId: string, stageId: string, userId: string): Promise<boolean> {
    const prereqs = await this.db
      .select({ requiredStageId: pathStagePrerequisites.requiredStageId })
      .from(pathStagePrerequisites)
      .where(and(
        eq(pathStagePrerequisites.pathId, pathId),
        eq(pathStagePrerequisites.stageId, stageId),
      ));

    if (prereqs.length === 0) return true;

    const prereqIds = prereqs.map((p) => p.requiredStageId);
    const [row] = await this.db
      .select({ count: sql<string>`count(*)` })
      .from(pathStageProgress)
      .where(and(
        eq(pathStageProgress.pathId, pathId),
        eq(pathStageProgress.userId, userId),
        inArray(pathStageProgress.stageId, prereqIds),
        eq(pathStageProgress.state, 'COMPLETE'),
      ));

    return Number(row.count) === prereqIds.length;
  }

  private async requireEnrolment(pathId: string, userId: string) {
    const [enrolment] = await this.db
      .select()
      .from(pathEnrolments)
      .where(and(
        eq(pathEnrolments.pathId, pathId),
        eq(pathEnrolments.userId, userId),
        eq(pathEnrolments.status, 'ACTIVE'),
      ))
      .limit(1);

    if (!enrolment) {
      throw new NotFoundException({ code: 'ENROLMENT_NOT_FOUND', message: 'Not enrolled in this path' });
    }

    return enrolment;
  }
}
