import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomUUID } from "crypto";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { notifications, users } from "../database/schema";
import { EmailService } from "../email/email.service";
import { AppConfigService } from "../config";
import { JOB_QUEUE, JobQueue } from "../jobs/job-queue";
import { CLOCK, Clock } from "../common/clock";
import { NotificationTemplateService } from "./notification-templates.service";
import { PushService } from "./push.service";

type DbType = PostgresJsDatabase<typeof schema>;

export type NotificationType =
  | "BATCH_ANNOUNCEMENT"
  | "BATCH_DOUBT_REPLY"
  | "BATCH_SESSION_SCHEDULED"
  | "BATCH_QUIZ_PUBLISHED"
  | "BATCH_RESOURCE_ADDED"
  | "BATCH_ENROLLMENT"
  | "BATCH_CERTIFICATE"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "GENERIC";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  batchId?: string;
}

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  vars: Record<string, string>;
  link?: string;
  batchId?: string;
  dedupeKey?: string;
}

const EMAIL_TYPES: ReadonlySet<NotificationType> = new Set([
  "BATCH_ENROLLMENT",
  "BATCH_CERTIFICATE",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
]);

const NOTIFICATION_FANOUT_JOB = "notifications.fanout";

type FanoutPayload = {
  fanoutId: string;
  userIds: string[];
  type: NotificationType;
  vars: Record<string, string>;
  link: string | undefined;
  batchId: string | undefined;
};

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    private readonly emailService: EmailService,
    private readonly configService: AppConfigService,
    private readonly templateService: NotificationTemplateService,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly push: PushService,
  ) {}

  onModuleInit(): void {
    this.jobs.register<FanoutPayload>(
      NOTIFICATION_FANOUT_JOB,
      async ({ fanoutId, userIds, type, vars, link, batchId }) => {
        for (const userId of userIds) {
          const dedupeKey = `${fanoutId}:${userId}`;
          await this.notify({ userId, type, vars, link, batchId, dedupeKey });
        }
      },
    );
  }

  async notify(input: NotifyInput): Promise<void> {
    const { subject, body } = await this.templateService.renderFor(input.type, input.vars);

    const [inserted] = await this.db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: subject,
        body,
        link: input.link,
        batchId: input.batchId,
        dedupeKey: input.dedupeKey ?? null,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      await this.deliverEmail(input.userId, inserted.title, inserted.body ?? undefined, inserted.link ?? undefined);
      await this.deliverPush(
        input.userId,
        inserted.title,
        inserted.body ?? "",
        inserted.link,
      );
    }
  }

  private async deliverPush(
    userId: string,
    title: string,
    body: string,
    link: string | null,
  ): Promise<void> {
    try {
      await this.push.deliver(userId, { title, body, link });
    } catch (err) {
      this.logger.warn(
        `Push delivery failed for ${userId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async queuedFanout(
    userIds: string[],
    type: NotificationType,
    vars: Record<string, string>,
    link?: string,
    batchId?: string,
    fanoutId?: string,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const resolvedFanoutId = fanoutId ?? randomUUID();
    await this.jobs.enqueue<FanoutPayload>(NOTIFICATION_FANOUT_JOB, {
      fanoutId: resolvedFanoutId,
      userIds,
      type,
      vars,
      link,
      batchId,
    });
  }

  private async deliverEmail(
    userId: string,
    title: string,
    body: string | undefined,
    link: string | undefined,
  ): Promise<void> {
    try {
      const [user] = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);
      if (!user?.email) return;
      const siteUrl = this.configService.frontendUrl ?? "";
      const absoluteLink = link
        ? link.startsWith("http") ? link : `${siteUrl}${link}`
        : null;
      await this.emailService.sendNotificationEmail(user.email, title, body ?? null, absoluteLink);
    } catch (err) {
      this.logger.warn(`Email notification failed for ${userId}: ${String(err)}`);
    }
  }

  private async sendEmailFor(
    userId: string,
    type: NotificationType,
    title: string,
    body: string | undefined,
    link: string | undefined,
  ): Promise<void> {
    if (!EMAIL_TYPES.has(type)) return;
    await this.deliverEmail(userId, title, body, link);
  }

  async create(input: CreateNotificationInput) {
    const [created] = await this.db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        batchId: input.batchId,
      })
      .returning();
    await this.sendEmailFor(input.userId, input.type, input.title, input.body, input.link);
    return created;
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return [];
    return this.db
      .insert(notifications)
      .values(
        inputs.map((i) => ({
          userId: i.userId,
          type: i.type,
          title: i.title,
          body: i.body,
          link: i.link,
          batchId: i.batchId,
        })),
      )
      .returning();
  }

  async fanout(userIds: string[], partial: Omit<CreateNotificationInput, "userId">) {
    if (userIds.length === 0) return;
    try {
      await this.createMany(userIds.map((userId) => ({ ...partial, userId })));
    } catch (err) {
      this.logger.error("Failed to fanout notifications", err);
    }
  }

  async listForUser(userId: string, opts: { page?: number; limit?: number }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const [rows, [{ count }], [{ unread }]] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(eq(notifications.userId, userId)),
      this.db
        .select({ unread: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), eq(notifications.read, false)),
        ),
    ]);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
      unread,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.read, false)),
      );
    return count;
  }

  async markRead(userId: string, notificationIds: string[]) {
    if (notificationIds.length === 0) return { updated: 0 };
    const updated = await this.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, userId),
          inArray(notifications.notificationId, notificationIds),
        ),
      )
      .returning({ id: notifications.notificationId });
    return { updated: updated.length };
  }

  async markAllRead(userId: string) {
    const updated = await this.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.read, false)),
      )
      .returning({ id: notifications.notificationId });
    return { updated: updated.length };
  }

  async delete(userId: string, notificationId: string) {
    await this.db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.notificationId, notificationId),
        ),
      );
    return { success: true };
  }
}
