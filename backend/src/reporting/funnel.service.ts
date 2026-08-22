import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { funnelEvents, users } from "../database/schema";
import { ViewerContext } from "./report-builder.service";

type FunnelStage =
  "PAGE_VIEW" | "CATALOGUE_VIEW" | "CHECKOUT_START" | "CHECKOUT_COMPLETE";

const FUNNEL_STAGES: FunnelStage[] = [
  "PAGE_VIEW",
  "CATALOGUE_VIEW",
  "CHECKOUT_START",
  "CHECKOUT_COMPLETE",
];

export interface FunnelResult {
  stages: Array<{
    kind: FunnelStage;
    count: number | null;
  }>;
  source: string | null;
  fromDate: string | null;
  toDate: string | null;
}

@Injectable()
export class FunnelService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getFunnel(
    viewer: ViewerContext,
    options: { fromDate?: string; toDate?: string; source?: string },
  ): Promise<FunnelResult> {
    const conditions = [];

    if (viewer.role === "CORPORATE_ADMIN") {
      const [adminRow] = await this.db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.userId, viewer.userId))
        .limit(1);

      if (!adminRow?.companyId)
        throw new ForbiddenException("Corporate admin has no company");

      const companyUsers = await this.db
        .select({ userId: users.userId })
        .from(users)
        .where(eq(users.companyId, adminRow.companyId));

      const companyUserIds = companyUsers.map((u) => u.userId);

      if (companyUserIds.length === 0)
        return {
          stages: FUNNEL_STAGES.map((kind) => ({ kind, count: null })),
          source: options.source ?? null,
          fromDate: options.fromDate ?? null,
          toDate: options.toDate ?? null,
        };

      conditions.push(inArray(funnelEvents.userId, companyUserIds));
    }

    if (options.source)
      conditions.push(eq(funnelEvents.source, options.source));

    if (options.fromDate)
      conditions.push(gte(funnelEvents.capturedAt, new Date(options.fromDate)));

    if (options.toDate)
      conditions.push(lte(funnelEvents.capturedAt, new Date(options.toDate)));

    const rows = await this.db
      .select({
        kind: funnelEvents.kind,
        count: sql<number>`count(*)::int`,
      })
      .from(funnelEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(funnelEvents.kind);

    const countByKind = new Map<string, number>();

    for (const row of rows) countByKind.set(row.kind, row.count);

    const capturedKinds = new Set(rows.map((r) => r.kind));

    const stages = FUNNEL_STAGES.map((kind) => ({
      kind,
      count: capturedKinds.has(kind) ? (countByKind.get(kind) ?? 0) : null,
    }));

    return {
      stages,
      source: options.source ?? null,
      fromDate: options.fromDate ?? null,
      toDate: options.toDate ?? null,
    };
  }
}
