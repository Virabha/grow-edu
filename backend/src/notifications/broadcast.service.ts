import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../audit/audit-log.service";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  batchEnrollments,
  broadcasts,
  corporateContracts,
  corporateSeats,
  corporateSubGroupMembers,
  users,
} from "../database/schema";
import { SendBroadcastDto } from "./dto/send-broadcast.dto";
import { NotificationsService } from "./notifications.service";

interface Actor {
  userId: string;
  role: string;
}

@Injectable()
export class BroadcastService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async send(dto: SendBroadcastDto, actor: Actor) {
    const recipientIds = await this.resolveAudience(dto);
    if (recipientIds.length === 0) {
      throw new BadRequestException(
        "That audience has nobody in it, so there is nothing to send",
      );
    }

    const sentAt = this.clock.now();
    const [record] = await this.db
      .insert(broadcasts)
      .values({
        audienceType: dto.audienceType,
        audienceId: dto.audienceId ?? null,
        segment: dto.segment ?? null,
        title: dto.title,
        body: dto.body,
        link: dto.link ?? null,
        recipientCount: recipientIds.length,
        recipientIds,
        sentBy: actor.userId,
        sentAt,
      })
      .returning();

    await this.notifications.queuedFanout(
      recipientIds,
      "GENERIC",
      { title: dto.title, body: dto.body },
      dto.link,
      dto.audienceType === "BATCH" ? (dto.audienceId ?? undefined) : undefined,
      `broadcast:${record.broadcastId}`,
    );

    await this.auditLog.record({
      action: "broadcast.send",
      targetType: "broadcast",
      targetId: record.broadcastId,
      after: {
        audienceType: dto.audienceType,
        audienceId: dto.audienceId ?? null,
        segment: dto.segment ?? null,
        recipientCount: recipientIds.length,
        title: dto.title,
      },
    });

    return this.present(record);
  }

  async history() {
    const rows = await this.db
      .select()
      .from(broadcasts)
      .orderBy(desc(broadcasts.sentAt));
    return rows.map((row) => this.present(row));
  }

  async recipientsOf(broadcastId: string) {
    const [record] = await this.db
      .select()
      .from(broadcasts)
      .where(eq(broadcasts.broadcastId, broadcastId))
      .limit(1);
    if (!record) throw new NotFoundException("Broadcast not found");

    if (record.recipientIds.length === 0) {
      return { ...this.present(record), recipients: [] };
    }

    const rows = await this.db
      .select({
        userId: users.userId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(inArray(users.userId, record.recipientIds));

    return { ...this.present(record), recipients: rows };
  }

  private async resolveAudience(dto: SendBroadcastDto): Promise<string[]> {
    if (dto.audienceType === "BATCH") {
      return this.uniqueIds(await this.batchAudience(this.requireId(dto)));
    }
    if (dto.audienceType === "CORPORATE") {
      return this.uniqueIds(await this.corporateAudience(this.requireId(dto)));
    }
    if (dto.audienceType === "SUB_GROUP") {
      return this.uniqueIds(await this.subGroupAudience(this.requireId(dto)));
    }
    return this.uniqueIds(await this.segmentAudience(dto));
  }

  private requireId(dto: SendBroadcastDto): string {
    if (!dto.audienceId) {
      throw new BadRequestException(
        `A ${dto.audienceType.toLowerCase()} broadcast needs an audienceId`,
      );
    }
    return dto.audienceId;
  }

  private async batchAudience(batchId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );
    if (rows.length === 0) {
      throw new NotFoundException("That batch has nobody enrolled");
    }
    return rows.map((r) => r.userId);
  }

  private async corporateAudience(companyId: string): Promise<string[]> {
    const contracts = await this.db
      .select({ contractId: corporateContracts.contractId })
      .from(corporateContracts)
      .where(eq(corporateContracts.companyId, companyId));
    if (contracts.length === 0) {
      throw new NotFoundException("That college has no contracts");
    }

    const rows = await this.db
      .select({ userId: corporateSeats.userId })
      .from(corporateSeats)
      .where(
        and(
          inArray(
            corporateSeats.contractId,
            contracts.map((c) => c.contractId),
          ),
          isNull(corporateSeats.releasedAt),
        ),
      );
    return rows.map((r) => r.userId);
  }

  private async subGroupAudience(subGroupId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: corporateSubGroupMembers.userId })
      .from(corporateSubGroupMembers)
      .where(eq(corporateSubGroupMembers.subGroupId, subGroupId));
    return rows.map((r) => r.userId);
  }

  private async segmentAudience(dto: SendBroadcastDto): Promise<string[]> {
    const segment = dto.segment ?? {};
    const conditions = [];

    if (segment.role) {
      conditions.push(eq(users.role, segment.role as "LEARNER"));
    }
    if (segment.companyId) {
      conditions.push(eq(users.companyId, segment.companyId));
    }
    if (segment.joinedAfter) {
      conditions.push(gte(users.createdAt, new Date(segment.joinedAfter)));
    }

    if (conditions.length === 0) {
      throw new BadRequestException(
        "A segment broadcast needs at least one filter, so it cannot go to everyone by accident",
      );
    }

    const rows = await this.db
      .select({ userId: users.userId })
      .from(users)
      .where(and(...conditions));
    return rows.map((r) => r.userId);
  }

  private uniqueIds(ids: string[]): string[] {
    return [...new Set(ids)];
  }

  private present(row: typeof broadcasts.$inferSelect) {
    return {
      broadcastId: row.broadcastId,
      audienceType: row.audienceType,
      audienceId: row.audienceId,
      segment: row.segment,
      title: row.title,
      body: row.body,
      link: row.link,
      recipientCount: row.recipientCount,
      sentBy: row.sentBy,
      sentAt: row.sentAt.toISOString(),
    };
  }
}
