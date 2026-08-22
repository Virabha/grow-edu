import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchEnrollments,
  batches,
  studentFeedback,
  users,
} from "../../database/schema";
import { NotificationsService } from "../../notifications/notifications.service";
import { BatchAccessService, SignedInViewer } from "../access/batch-access.service";
import { WriteFeedbackDto } from "../dto/write-feedback.dto";

@Injectable()
export class StudentFeedbackService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  async write(
    batchId: string,
    userId: string,
    dto: WriteFeedbackDto,
    author: SignedInViewer,
  ) {
    const { batch } = await this.access.require(batchId, author, "MANAGE");

    const [enrolled] = await this.db
      .select({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!enrolled) {
      throw new BadRequestException(
        "That student is not on this batch, so there is nothing to give feedback on",
      );
    }

    const now = this.clock.now();
    const [written] = await this.db
      .insert(studentFeedback)
      .values({
        batchId,
        userId,
        authorId: author.userId,
        body: dto.body,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.notifications.queuedFanout(
      [userId],
      "GENERIC",
      {
        title: `Feedback on ${batch.title}`,
        body: dto.body.slice(0, 200),
      },
      `/batches/${batch.slug}/feedback`,
      batchId,
      `feedback:${written.feedbackId}`,
    );

    return this.present(written, null);
  }

  async forStudent(
    batchId: string,
    userId: string,
    viewer: SignedInViewer,
  ) {
    const { isStaff } = await this.access.require(batchId, viewer, "READ");
    if (!isStaff && viewer.userId !== userId) {
      throw new ForbiddenException("That feedback was written for someone else");
    }

    const rows = await this.db
      .select({
        feedback: studentFeedback,
        author: {
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(studentFeedback)
      .innerJoin(users, eq(users.userId, studentFeedback.authorId))
      .where(
        and(
          eq(studentFeedback.batchId, batchId),
          eq(studentFeedback.userId, userId),
          eq(studentFeedback.isDeleted, false),
        ),
      )
      .orderBy(desc(studentFeedback.createdAt));

    return rows.map(({ feedback, author }) => {
      const name = [author.firstName, author.lastName]
        .filter(Boolean)
        .join(" ");
      return this.present(feedback, name.length > 0 ? name : author.email);
    });
  }

  async mine(viewer: SignedInViewer) {
    const rows = await this.db
      .select({ feedback: studentFeedback, batch: batches })
      .from(studentFeedback)
      .innerJoin(batches, eq(batches.batchId, studentFeedback.batchId))
      .where(
        and(
          eq(studentFeedback.userId, viewer.userId),
          eq(studentFeedback.isDeleted, false),
        ),
      )
      .orderBy(desc(studentFeedback.createdAt));

    return rows.map(({ feedback, batch }) => ({
      ...this.present(feedback, null),
      batchTitle: batch.title,
      batchSlug: batch.slug,
    }));
  }

  async remove(
    batchId: string,
    feedbackId: string,
    viewer: SignedInViewer,
  ) {
    await this.access.require(batchId, viewer, "MANAGE");
    const [removed] = await this.db
      .update(studentFeedback)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(
        and(
          eq(studentFeedback.feedbackId, feedbackId),
          eq(studentFeedback.batchId, batchId),
          eq(studentFeedback.isDeleted, false),
        ),
      )
      .returning({ feedbackId: studentFeedback.feedbackId });

    if (!removed) throw new NotFoundException("Feedback not found");
    return { feedbackId: removed.feedbackId, removed: true };
  }

  private present(
    row: typeof studentFeedback.$inferSelect,
    authorName: string | null,
  ) {
    return {
      feedbackId: row.feedbackId,
      batchId: row.batchId,
      userId: row.userId,
      body: row.body,
      authorId: row.authorId,
      authorName,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
