import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { pathEnrolments, pathStagePrerequisites, pathStageProgress, pathStages } from '../database/schema';
import { EnrolUserDto } from './dto/enrol-user.dto';

@Injectable()
export class PathEnrolmentService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async enrol(pathId: string, dto: EnrolUserDto, grantedBy: string) {
    const now = this.clock.now();

    const [existing] = await this.db
      .select()
      .from(pathEnrolments)
      .where(and(
        eq(pathEnrolments.pathId, pathId),
        eq(pathEnrolments.userId, dto.userId),
      ))
      .limit(1);

    if (existing && existing.status === 'ACTIVE') {
      throw new ConflictException({ code: 'ALREADY_ENROLLED', message: 'Student is already enrolled in this path' });
    }

    let enrolment;
    if (existing) {
      [enrolment] = await this.db
        .update(pathEnrolments)
        .set({ status: 'ACTIVE', grantedBy, enrolledAt: now, revokedAt: null, completedAt: null })
        .where(eq(pathEnrolments.enrolmentId, existing.enrolmentId))
        .returning();
    } else {
      [enrolment] = await this.db
        .insert(pathEnrolments)
        .values({
          pathId,
          userId: dto.userId,
          grantedBy,
          enrolledAt: now,
        })
        .returning();
    }

    await this.initializeProgress(pathId, dto.userId, now);

    return enrolment;
  }

  async revoke(pathId: string, userId: string) {
    const [enrolment] = await this.db
      .update(pathEnrolments)
      .set({ status: 'REVOKED', revokedAt: this.clock.now() })
      .where(and(
        eq(pathEnrolments.pathId, pathId),
        eq(pathEnrolments.userId, userId),
        eq(pathEnrolments.status, 'ACTIVE'),
      ))
      .returning();

    if (!enrolment) {
      throw new NotFoundException({ code: 'ENROLMENT_NOT_FOUND', message: 'Active enrolment not found' });
    }
    return { revoked: true };
  }

  async listEnrolled(pathId: string) {
    return this.db
      .select()
      .from(pathEnrolments)
      .where(eq(pathEnrolments.pathId, pathId));
  }

  async myEnrolments(userId: string) {
    return this.db
      .select()
      .from(pathEnrolments)
      .where(and(
        eq(pathEnrolments.userId, userId),
        eq(pathEnrolments.status, 'ACTIVE'),
      ));
  }

  private async initializeProgress(pathId: string, userId: string, now: Date) {
    const stages = await this.db
      .select({ stageId: pathStages.stageId })
      .from(pathStages)
      .where(and(
        eq(pathStages.pathId, pathId),
        eq(pathStages.isDeleted, false),
      ));

    if (stages.length === 0) return;

    const prereqs = await this.db
      .select({ stageId: pathStagePrerequisites.stageId })
      .from(pathStagePrerequisites)
      .where(eq(pathStagePrerequisites.pathId, pathId));

    const stagesWithPrereqs = new Set(prereqs.map((p) => p.stageId));

    for (const stage of stages) {
      const state: 'LOCKED' | 'OPEN' = stagesWithPrereqs.has(stage.stageId) ? 'LOCKED' : 'OPEN';

      await this.db
        .insert(pathStageProgress)
        .values({
          pathId,
          stageId: stage.stageId,
          userId,
          state,
          openedAt: state === 'OPEN' ? now : null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [pathStageProgress.stageId, pathStageProgress.userId],
          set: {
            state,
            openedAt: state === 'OPEN' ? now : null,
            completedAt: null,
            updatedAt: now,
          },
        });
    }
  }
}
