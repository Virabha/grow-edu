import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { notificationTemplates } from "../database/schema";
import { CLOCK, Clock } from "../common/clock";
import { NotificationType } from "./notifications.service";

type DbType = PostgresJsDatabase<typeof schema>;

function requireKnownType(type: string): NotificationType {
  if (!(type in DEFAULT_TEMPLATES)) {
    throw new NotFoundException(`Unknown notification type: ${type}`);
  }
  return type as NotificationType;
}

const DEFAULT_TEMPLATES: Record<NotificationType, { subject: string; body: string }> = {
  BATCH_ANNOUNCEMENT: { subject: "{{title}}", body: "{{body}}" },
  BATCH_DOUBT_REPLY: { subject: "{{title}}", body: "{{body}}" },
  BATCH_SESSION_SCHEDULED: { subject: "{{title}}", body: "{{body}}" },
  BATCH_QUIZ_PUBLISHED: { subject: "{{title}}", body: "{{body}}" },
  BATCH_RESOURCE_ADDED: { subject: "{{title}}", body: "{{body}}" },
  BATCH_ENROLLMENT: { subject: "{{title}}", body: "{{body}}" },
  BATCH_CERTIFICATE: { subject: "{{title}}", body: "{{body}}" },
  PAYMENT_APPROVED: { subject: "{{title}}", body: "{{body}}" },
  PAYMENT_REJECTED: { subject: "{{title}}", body: "{{body}}" },
  WEEKLY_REPORT_CARD: {
    subject: "Your weekly study report",
    body: "{{summary}}",
  },
  BADGE_AWARDED: {
    subject: "You earned a badge: {{badgeName}}",
    body: "Congratulations! You earned the {{badgeName}} badge.",
  },
  PARENT_LINK_REQUEST: {
    subject: "{{parentName}} would like to follow your progress",
    body: "{{body}}",
  },
  DAILY_REVIEW_DUE: {
    subject: "Your review queue is ready",
    body: "{{body}}",
  },
  CODE_VERDICT: {
    subject: "{{problemTitle}}: {{verdict}}",
    body: "{{body}}",
  },
  PROJECT_MILESTONE_REVIEWED: {
    subject: "{{milestoneTitle}} has been reviewed",
    body: "{{body}}",
  },
  PATH_CERTIFICATE: {
    subject: "Your {{pathTitle}} credential has been issued",
    body: "{{body}}",
  },
  GENERIC: { subject: "{{title}}", body: "{{body}}" },
};

@Injectable()
export class NotificationTemplateService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private render(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
  }

  async findAll(): Promise<Array<{ type: string; subject: string; body: string; isCustom: boolean }>> {
    const rows = await this.db.select().from(notificationTemplates);
    const stored = new Map(rows.map((r) => [r.type, r]));

    return (Object.entries(DEFAULT_TEMPLATES) as [NotificationType, { subject: string; body: string }][]).map(
      ([type, defaults]) => {
        const row = stored.get(type);
        return {
          type,
          subject: row ? row.subject : defaults.subject,
          body: row ? row.body : defaults.body,
          isCustom: row !== undefined,
        };
      },
    );
  }

  async findOne(type: string): Promise<{ type: string; subject: string; body: string; isCustom: boolean }> {
    const known = requireKnownType(type);
    const [row] = await this.db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.type, known))
      .limit(1);

    const defaults = DEFAULT_TEMPLATES[known];
    return {
      type,
      subject: row ? row.subject : defaults.subject,
      body: row ? row.body : defaults.body,
      isCustom: row !== undefined,
    };
  }

  async upsert(type: string, input: { subject: string; body: string }): Promise<void> {
    const known = requireKnownType(type);
    const now = this.clock.now();
    await this.db
      .insert(notificationTemplates)
      .values({ type: known, subject: input.subject, body: input.body, updatedAt: now })
      .onConflictDoUpdate({
        target: notificationTemplates.type,
        set: { subject: input.subject, body: input.body, updatedAt: now },
      });
  }

  async renderFor(
    type: NotificationType,
    vars: Record<string, string>,
  ): Promise<{ subject: string; body: string }> {
    const [row] = await this.db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.type, type))
      .limit(1);

    const defaults = DEFAULT_TEMPLATES[type] ?? { subject: "{{title}}", body: "{{body}}" };
    const subject = row ? row.subject : defaults.subject;
    const body = row ? row.body : defaults.body;

    return {
      subject: this.render(subject, vars),
      body: this.render(body, vars),
    };
  }
}
