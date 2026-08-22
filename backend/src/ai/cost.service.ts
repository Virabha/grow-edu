import { Inject, Injectable } from "@nestjs/common";
import { and, gte, lte, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { aiModelCalls } from "../database/schema";

export interface CostWindow {
  from: Date;
  to: Date;
}

export interface CostRow {
  feature: string;
  organizationId: string;
  model: string;
  calls: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

@Injectable()
export class AiCostService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async breakdown(window: CostWindow): Promise<CostRow[]> {
    const rows = await this.db
      .select({
        feature: aiModelCalls.feature,
        organizationId: aiModelCalls.organizationId,
        model: aiModelCalls.model,
        calls: sql<number>`count(*)::int`,
        failures: sql<number>`sum(case when ${aiModelCalls.outcome} = 'SUCCEEDED' then 0 else 1 end)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiModelCalls.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${aiModelCalls.outputTokens}), 0)::int`,
        cacheReadTokens: sql<number>`coalesce(sum(${aiModelCalls.cacheReadTokens}), 0)::int`,
        cacheWriteTokens: sql<number>`coalesce(sum(${aiModelCalls.cacheWriteTokens}), 0)::int`,
      })
      .from(aiModelCalls)
      .where(
        and(
          gte(aiModelCalls.createdAt, window.from),
          lte(aiModelCalls.createdAt, window.to),
        ),
      )
      .groupBy(
        aiModelCalls.feature,
        aiModelCalls.organizationId,
        aiModelCalls.model,
      )
      .orderBy(aiModelCalls.feature, aiModelCalls.organizationId, aiModelCalls.model);

    return rows;
  }
}
