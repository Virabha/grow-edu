import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchEnrollments,
  batchInstructors,
  batchSubjects,
  batches,
  lessons,
  pathEnrolments,
  pathStageProgress,
  pathStages,
  subjectLessons,
} from "../../database/schema";
import {
  BATCH_ACCESS_EXPIRED,
  BATCH_NOT_FOUND,
  CONTENT_LOCKED,
} from "./access.errors";
import { CLOCK, Clock } from "../../common/clock";

const MILLIS_PER_DAY = 86_400_000;

export type Viewer = { userId?: string; role?: string };
export type SignedInViewer = Viewer & { userId: string };
export type AccessLevel = "READ" | "MANAGE";

export type Batch = typeof batches.$inferSelect;
export type Enrollment = typeof batchEnrollments.$inferSelect;

export type Access = {
  batch: Batch;
  isStaff: boolean;
  enrollment: Enrollment | null;
};

@Injectable()
export class BatchAccessService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async require(
    batchId: string,
    viewer: Viewer,
    level: AccessLevel,
  ): Promise<Access> {
    const batch = await this.load(batchId);
    if (!batch) throw this.absent();

    const isStaff = await this.isStaff(batchId, viewer);
    if (isStaff) return { batch, isStaff: true, enrollment: null };
    if (level === "MANAGE" || !viewer.userId) throw this.absent();

    const enrollment = await this.activeEnrollment(batchId, viewer.userId);
    if (enrollment) {
      if (enrollment.accessEndsAt && enrollment.accessEndsAt < this.clock.now()) {
        throw new ForbiddenException({
          code: BATCH_ACCESS_EXPIRED,
          message:
            "Your access to this batch has ended. Contact support to renew it.",
        });
      }
      return { batch, isStaff: false, enrollment };
    }

    const hasPathAccess = await this.hasActiveBatchViaPath(batchId, viewer.userId);
    if (!hasPathAccess) throw this.absent();

    return { batch, isStaff: false, enrollment: null };
  }

  async requireForSubject(
    subjectId: string,
    viewer: Viewer,
    level: AccessLevel,
  ): Promise<Access & { subjectId: string }> {
    const [subject] = await this.db
      .select({ batchId: batchSubjects.batchId })
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.subjectId, subjectId),
          eq(batchSubjects.isDeleted, false),
        ),
      )
      .limit(1);
    if (!subject) throw this.absent();
    return { ...(await this.require(subject.batchId, viewer, level)), subjectId };
  }

  async requireForLesson(
    lessonId: string,
    viewer: Viewer,
    level: AccessLevel,
    batchId?: string,
  ): Promise<Access & { lesson: typeof lessons.$inferSelect }> {
    const placedIn = [
      eq(subjectLessons.lessonId, lessonId),
      eq(subjectLessons.isDeleted, false),
      eq(lessons.isDeleted, false),
    ];
    if (batchId) placedIn.push(eq(batchSubjects.batchId, batchId));

    const [row] = await this.db
      .select({
        lesson: lessons,
        batchId: batchSubjects.batchId,
        placement: subjectLessons,
      })
      .from(subjectLessons)
      .innerJoin(lessons, eq(lessons.lessonId, subjectLessons.lessonId))
      .innerJoin(
        batchSubjects,
        eq(batchSubjects.subjectId, subjectLessons.subjectId),
      )
      .where(and(...placedIn))
      .limit(1);
    if (!row) throw this.absent();

    if (
      level === "READ" &&
      row.lesson.isFreePreview &&
      row.lesson.status === "READY"
    ) {
      const batch = await this.load(row.batchId);
      if (!batch) throw this.absent();
      return {
        batch,
        isStaff: await this.isStaff(row.batchId, viewer),
        enrollment: null,
        lesson: row.lesson,
      };
    }

    const access = await this.require(row.batchId, viewer, level);

    if (level === "READ" && !access.isStaff) {
      const unlocksAt = this.unlockTimeFor(row.placement, access.enrollment);
      if (unlocksAt !== null && unlocksAt.getTime() > this.clock.now().getTime()) {
        throw new ForbiddenException({
          code: CONTENT_LOCKED,
          message: "This is not open yet.",
          unlocksAt: unlocksAt.toISOString(),
        });
      }
    }

    return { ...access, lesson: row.lesson };
  }

  unlockTimeFor(
    placement: Pick<
      typeof subjectLessons.$inferSelect,
      "unlockAt" | "unlockAfterDays"
    >,
    enrollment: Enrollment | null,
  ): Date | null {
    if (placement.unlockAt !== null) return placement.unlockAt;
    if (placement.unlockAfterDays === null) return null;
    const from = enrollment?.accessStartsAt ?? enrollment?.createdAt;
    if (!from) return null;
    return new Date(
      from.getTime() + placement.unlockAfterDays * MILLIS_PER_DAY,
    );
  }

  async requireBatch(batchId: string): Promise<Batch> {
    const batch = await this.load(batchId);
    if (!batch) throw this.absent();
    return batch;
  }

  async isEnrolled(batchId: string, userId: string): Promise<boolean> {
    return (await this.activeEnrollment(batchId, userId)) !== null;
  }

  async enrolledUserIds(batchId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );
    return rows.map((r) => r.userId);
  }

  async enrolledBatchIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ batchId: batchEnrollments.batchId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );
    return rows.map((r) => r.batchId);
  }

  async taughtBatchIds(instructorId: string): Promise<string[]> {
    const rows = await this.db
      .select({ batchId: batchInstructors.batchId })
      .from(batchInstructors)
      .where(eq(batchInstructors.instructorId, instructorId));
    return rows.map((r) => r.batchId);
  }

  async instructorsOn(batchIds: string[]) {
    if (batchIds.length === 0) return [];
    return this.db
      .select()
      .from(batchInstructors)
      .where(inArray(batchInstructors.batchId, batchIds));
  }

  private async load(batchId: string): Promise<Batch | null> {
    const [batch] = await this.db
      .select()
      .from(batches)
      .where(and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)))
      .limit(1);
    return batch ?? null;
  }

  async isStaff(batchId: string, viewer: Viewer): Promise<boolean> {
    if (viewer.role === "PLATFORM_ADMIN") return true;
    if (viewer.role !== "INSTRUCTOR" || !viewer.userId) return false;
    const [row] = await this.db
      .select({ batchId: batchInstructors.batchId })
      .from(batchInstructors)
      .where(
        and(
          eq(batchInstructors.batchId, batchId),
          eq(batchInstructors.instructorId, viewer.userId),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  private async hasActiveBatchViaPath(batchId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ enrolmentId: pathEnrolments.enrolmentId })
      .from(pathEnrolments)
      .innerJoin(pathStages, eq(pathStages.pathId, pathEnrolments.pathId))
      .innerJoin(
        pathStageProgress,
        and(
          eq(pathStageProgress.stageId, pathStages.stageId),
          eq(pathStageProgress.userId, userId),
        ),
      )
      .where(
        and(
          eq(pathEnrolments.userId, userId),
          eq(pathEnrolments.status, "ACTIVE"),
          eq(pathStages.kind, "BATCH"),
          eq(pathStages.batchId, batchId),
          eq(pathStages.isDeleted, false),
          inArray(pathStageProgress.state, ["OPEN", "COMPLETE"]),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  private async activeEnrollment(
    batchId: string,
    userId: string,
  ): Promise<Enrollment | null> {
    const [row] = await this.db
      .select()
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private absent(): NotFoundException {
    return new NotFoundException({
      code: BATCH_NOT_FOUND,
      message: "Batch not found",
    });
  }
}
