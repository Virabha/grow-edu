import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { auditLog } from "../database/schema";
import { Queryable } from "../database/transaction";
import { currentRequestContext } from "./request-context";

export interface AuditEntry {
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  tx?: Queryable;
}

export interface AuditSearch {
  actorId?: string;
  targetType?: string;
  targetId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

const MAX_RESULTS = 200;

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    const context = currentRequestContext();
    const actor = context?.request.user;
    const db = entry.tx ?? this.db;

    try {
      await db.insert(auditLog).values({
        actorId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        impersonatorId: actor?.impersonatorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        before: entry.before ?? null,
        after: entry.after ?? null,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
        requestId: context?.requestId ?? null,
        createdAt: this.clock.now(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit entry "${entry.action}": ${String(error)}`,
      );
    }
  }

  async search(filters: AuditSearch) {
    const conditions = [];
    if (filters.actorId) conditions.push(eq(auditLog.actorId, filters.actorId));
    if (filters.targetType) {
      conditions.push(eq(auditLog.targetType, filters.targetType));
    }
    if (filters.targetId) {
      conditions.push(eq(auditLog.targetId, filters.targetId));
    }
    if (filters.action) conditions.push(eq(auditLog.action, filters.action));
    if (filters.from) conditions.push(gte(auditLog.createdAt, filters.from));
    if (filters.to) conditions.push(lte(auditLog.createdAt, filters.to));

    return this.db
      .select()
      .from(auditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(Math.min(filters.limit ?? 50, MAX_RESULTS));
  }
}
