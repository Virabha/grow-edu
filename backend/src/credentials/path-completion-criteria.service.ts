import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { pathCompletionCriteria } from "../database/schema";

type DbType = PostgresJsDatabase<typeof schema>;

export interface UpsertPathCriteriaDto {
  requireCapstone: boolean;
  minStagesCompletePercent: number;
}

@Injectable()
export class PathCompletionCriteriaService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async get(pathId: string) {
    const [row] = await this.db
      .select()
      .from(pathCompletionCriteria)
      .where(eq(pathCompletionCriteria.pathId, pathId))
      .limit(1);
    return row ?? null;
  }

  async upsert(pathId: string, dto: UpsertPathCriteriaDto, actorId: string) {
    const now = this.clock.now();
    const [row] = await this.db
      .insert(pathCompletionCriteria)
      .values({
        pathId,
        requireCapstone: dto.requireCapstone,
        minStagesCompletePercent: dto.minStagesCompletePercent,
        updatedBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [pathCompletionCriteria.pathId],
        set: {
          requireCapstone: dto.requireCapstone,
          minStagesCompletePercent: dto.minStagesCompletePercent,
          updatedBy: actorId,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }
}
