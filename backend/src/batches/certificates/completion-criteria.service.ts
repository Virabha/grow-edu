import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batchCompletionCriteria } from "../../database/schema";

export interface UpsertCriteriaDto {
  minLessonCompletionPercent: number;
  minAttendancePercent: number;
  minTestAveragePercent: number;
}

@Injectable()
export class CompletionCriteriaService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async get(batchId: string) {
    const [row] = await this.db
      .select()
      .from(batchCompletionCriteria)
      .where(eq(batchCompletionCriteria.batchId, batchId))
      .limit(1);
    return row ?? null;
  }

  async upsert(batchId: string, dto: UpsertCriteriaDto, actorId: string) {
    const now = this.clock.now();
    const [row] = await this.db
      .insert(batchCompletionCriteria)
      .values({
        batchId,
        minLessonCompletionPercent: dto.minLessonCompletionPercent,
        minAttendancePercent: dto.minAttendancePercent,
        minTestAveragePercent: dto.minTestAveragePercent,
        updatedBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [batchCompletionCriteria.batchId],
        set: {
          minLessonCompletionPercent: dto.minLessonCompletionPercent,
          minAttendancePercent: dto.minAttendancePercent,
          minTestAveragePercent: dto.minTestAveragePercent,
          updatedBy: actorId,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }
}
