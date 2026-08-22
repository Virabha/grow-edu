import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  batchAttendance,
  batchDoubts,
  batchEnrollments,
  batchInstructors,
  batchSessions,
  batches,
  users,
} from "../database/schema";

export interface InstructorStat {
  instructorId: string;
  name: string | null;
  batchCount: number;
  attendanceRate: number | null;
  completionRate: number | null;
  avgDoubtResponseSeconds: number | null;
}

@Injectable()
export class InstructorComparisonService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async compare(options: {
    fromDate?: string;
    toDate?: string;
    requestingUserId: string;
    requestingRole: string;
  }): Promise<InstructorStat[]> {
    const batchDateConditions = [];
    if (options.fromDate) {
      batchDateConditions.push(gte(batches.startDate, new Date(options.fromDate)));
    }
    if (options.toDate) {
      batchDateConditions.push(lte(batches.endDate, new Date(options.toDate)));
    }

    const batchJoinCondition =
      batchDateConditions.length > 0
        ? and(eq(batchInstructors.batchId, batches.batchId), ...batchDateConditions)
        : eq(batchInstructors.batchId, batches.batchId);

    const instructorRows = await this.db
      .select({
        instructorId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        batchCount: sql<number>`count(distinct ${batches.batchId})::int`,
      })
      .from(users)
      .leftJoin(batchInstructors, eq(batchInstructors.instructorId, users.userId))
      .leftJoin(batches, batchJoinCondition)
      .where(eq(users.role, "INSTRUCTOR" as never))
      .groupBy(users.userId, users.firstName, users.lastName);

    if (instructorRows.length === 0) return [];

    const instructorIds = instructorRows.map((r) => r.instructorId);

    const attendanceData = await this.db
      .select({
        instructorId: batchInstructors.instructorId,
        sessionCount: sql<number>`count(distinct ${batchSessions.sessionId})::int`,
        totalAttendance: sql<number>`count(distinct concat(${batchAttendance.sessionId}, ':', ${batchAttendance.userId}))::int`,
        totalExpected: sql<number>`(
          count(distinct ${batchSessions.sessionId}) *
          count(distinct ${batchEnrollments.userId})
        )::int`,
      })
      .from(batchInstructors)
      .innerJoin(batches, eq(batchInstructors.batchId, batches.batchId))
      .leftJoin(batchSessions, eq(batchSessions.batchId, batches.batchId))
      .leftJoin(
        batchAttendance,
        eq(batchAttendance.sessionId, batchSessions.sessionId),
      )
      .leftJoin(
        batchEnrollments,
        eq(batchEnrollments.batchId, batches.batchId),
      )
      .where(
        and(
          sql`${batchInstructors.instructorId} = any(array[${sql.join(
            instructorIds.map((id) => sql`${id}`),
            sql`, `,
          )}])`,
          ...(batchDateConditions.length > 0 ? batchDateConditions : []),
        ),
      )
      .groupBy(batchInstructors.instructorId);

    const completionData = await this.db
      .select({
        instructorId: batchInstructors.instructorId,
        totalEnrollments: sql<number>`count(distinct ${batchEnrollments.userId})::int`,
        completedEnrollments: sql<number>`count(distinct case when ${batchEnrollments.status} = 'COMPLETED' then ${batchEnrollments.userId} end)::int`,
      })
      .from(batchInstructors)
      .innerJoin(batches, eq(batchInstructors.batchId, batches.batchId))
      .leftJoin(
        batchEnrollments,
        eq(batchEnrollments.batchId, batches.batchId),
      )
      .where(
        and(
          sql`${batchInstructors.instructorId} = any(array[${sql.join(
            instructorIds.map((id) => sql`${id}`),
            sql`, `,
          )}])`,
          ...(batchDateConditions.length > 0 ? batchDateConditions : []),
        ),
      )
      .groupBy(batchInstructors.instructorId);

    const responsivenessData = await this.db
      .select({
        instructorId: batchInstructors.instructorId,
        avgResponseSeconds: sql<number>`
          avg(
            extract(epoch from (
              (select min(r2.created_at) from batch_doubt_replies r2
               where r2.doubt_id = ${batchDoubts.doubtId} and r2.is_official = true)
              - ${batchDoubts.createdAt}
            ))
          )::float
        `,
      })
      .from(batchInstructors)
      .innerJoin(batches, eq(batchInstructors.batchId, batches.batchId))
      .innerJoin(batchDoubts, eq(batchDoubts.batchId, batches.batchId))
      .where(
        and(
          sql`${batchInstructors.instructorId} = any(array[${sql.join(
            instructorIds.map((id) => sql`${id}`),
            sql`, `,
          )}])`,
          ...(batchDateConditions.length > 0 ? batchDateConditions : []),
        ),
      )
      .groupBy(batchInstructors.instructorId);

    const attendanceMap = new Map(
      attendanceData.map((r) => [r.instructorId, r]),
    );
    const completionMap = new Map(
      completionData.map((r) => [r.instructorId, r]),
    );
    const responsivenessMap = new Map(
      responsivenessData.map((r) => [r.instructorId, r]),
    );

    return instructorRows.map((row) => {
      const att = attendanceMap.get(row.instructorId);
      const comp = completionMap.get(row.instructorId);
      const resp = responsivenessMap.get(row.instructorId);

      let attendanceRate: number | null = null;
      if (att && att.totalExpected > 0) {
        attendanceRate = att.totalAttendance / att.totalExpected;
      }

      let completionRate: number | null = null;
      if (comp && comp.totalEnrollments > 0) {
        completionRate = comp.completedEnrollments / comp.totalEnrollments;
      }

      const avgDoubtResponseSeconds =
        resp?.avgResponseSeconds ?? null;

      return {
        instructorId: row.instructorId,
        name: [row.firstName, row.lastName].filter(Boolean).join(" ") || null,
        batchCount: row.batchCount,
        attendanceRate,
        completionRate,
        avgDoubtResponseSeconds,
      };
    });
  }
}
