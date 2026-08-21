import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchAttendance,
  batchQuizAttempts,
  batchQuizzes,
  batchSessions,
  corporateContractBatches,
  corporateContracts,
  corporateSeats,
  corporateSubGroupMembers,
  users,
} from "../../database/schema";

export type AttendanceReportRow = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  totalSessions: number;
  attendedCount: number;
  attendancePercent: number | null;
  sessions: Array<{
    sessionId: string;
    batchId: string;
    title: string;
    attended: boolean;
  }>;
};

export type TestPerformanceReportRow = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  averageScorePercent: number | null;
  quizzes: Array<{
    quizId: string;
    batchId: string;
    title: string;
    scorePercent: number | null;
    attempted: boolean;
  }>;
};

@Injectable()
export class CorporateReportService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async assertOwnsContract(userId: string, contractId: string): Promise<void> {
    const [userRow] = await this.db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!userRow?.companyId) {
      throw new ForbiddenException("Your account is not linked to an organisation");
    }

    const [contract] = await this.db
      .select({ contractId: corporateContracts.contractId })
      .from(corporateContracts)
      .where(
        and(
          eq(corporateContracts.contractId, contractId),
          eq(corporateContracts.companyId, userRow.companyId),
        ),
      )
      .limit(1);

    if (!contract) throw new NotFoundException("Contract not found");
  }

  private async studentIdsForContract(contractId: string, subGroupId?: string): Promise<string[]> {
    if (subGroupId) {
      const rows = await this.db
        .select({ userId: corporateSubGroupMembers.userId })
        .from(corporateSubGroupMembers)
        .where(
          and(
            eq(corporateSubGroupMembers.subGroupId, subGroupId),
            eq(corporateSubGroupMembers.contractId, contractId),
          ),
        );
      return rows.map((r) => r.userId);
    }

    const rows = await this.db
      .select({ userId: corporateSeats.userId })
      .from(corporateSeats)
      .where(
        and(
          eq(corporateSeats.contractId, contractId),
          isNull(corporateSeats.releasedAt),
        ),
      );
    return rows.map((r) => r.userId);
  }

  private async batchIdsForContract(contractId: string): Promise<string[]> {
    const rows = await this.db
      .select({ batchId: corporateContractBatches.batchId })
      .from(corporateContractBatches)
      .where(eq(corporateContractBatches.contractId, contractId));
    return rows.map((r) => r.batchId);
  }

  async attendanceReport(
    contractId: string,
    subGroupId?: string,
  ): Promise<AttendanceReportRow[]> {
    const [studentIds, batchIds] = await Promise.all([
      this.studentIdsForContract(contractId, subGroupId),
      this.batchIdsForContract(contractId),
    ]);

    if (studentIds.length === 0 || batchIds.length === 0) return [];

    const [sessionRows, attendanceRows, userRows] = await Promise.all([
      this.db
        .select({
          sessionId: batchSessions.sessionId,
          batchId: batchSessions.batchId,
          title: batchSessions.title,
        })
        .from(batchSessions)
        .where(
          and(
            inArray(batchSessions.batchId, batchIds),
            eq(batchSessions.type, "LIVE"),
            eq(batchSessions.isDeleted, false),
          ),
        ),
      this.db
        .select({
          sessionId: batchAttendance.sessionId,
          userId: batchAttendance.userId,
        })
        .from(batchAttendance)
        .where(
          and(
            inArray(batchAttendance.batchId, batchIds),
            inArray(batchAttendance.userId, studentIds),
          ),
        ),
      this.db
        .select({
          userId: users.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(inArray(users.userId, studentIds)),
    ]);

    const attendedSet = new Set(attendanceRows.map((a) => `${a.sessionId}:${a.userId}`));

    return userRows.map((u) => {
      const sessions = sessionRows.map((s) => ({
        sessionId: s.sessionId,
        batchId: s.batchId,
        title: s.title,
        attended: attendedSet.has(`${s.sessionId}:${u.userId}`),
      }));
      const attendedCount = sessions.filter((s) => s.attended).length;
      const totalSessions = sessions.length;
      return {
        userId: u.userId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        totalSessions,
        attendedCount,
        attendancePercent:
          totalSessions > 0
            ? Number(((attendedCount / totalSessions) * 100).toFixed(1))
            : null,
        sessions,
      };
    });
  }

  async testPerformanceReport(
    contractId: string,
    subGroupId?: string,
  ): Promise<TestPerformanceReportRow[]> {
    const [studentIds, batchIds] = await Promise.all([
      this.studentIdsForContract(contractId, subGroupId),
      this.batchIdsForContract(contractId),
    ]);

    if (studentIds.length === 0 || batchIds.length === 0) return [];

    const [quizRows, userRows] = await Promise.all([
      this.db
        .select({
          quizId: batchQuizzes.quizId,
          batchId: batchQuizzes.batchId,
          title: batchQuizzes.title,
        })
        .from(batchQuizzes)
        .where(
          and(
            inArray(batchQuizzes.batchId, batchIds),
            eq(batchQuizzes.isDeleted, false),
          ),
        ),
      this.db
        .select({
          userId: users.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(inArray(users.userId, studentIds)),
    ]);

    const quizIds = quizRows.map((q) => q.quizId);

    if (quizIds.length === 0) {
      return userRows.map((u) => ({
        userId: u.userId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        averageScorePercent: null,
        quizzes: [],
      }));
    }

    const attemptRows = await this.db
      .select({
        quizId: batchQuizAttempts.quizId,
        userId: batchQuizAttempts.userId,
        score: batchQuizAttempts.score,
        maxScore: batchQuizAttempts.maxScore,
      })
      .from(batchQuizAttempts)
      .where(
        and(
          inArray(batchQuizAttempts.quizId, quizIds),
          inArray(batchQuizAttempts.userId, studentIds),
          eq(batchQuizAttempts.status, "SUBMITTED"),
        ),
      );

    const bestAttempts = new Map<string, { score: number; max: number }>();
    for (const a of attemptRows) {
      const key = `${a.quizId}:${a.userId}`;
      const score = a.score ? Number(a.score) : 0;
      const max = a.maxScore ? Number(a.maxScore) : 0;
      const prev = bestAttempts.get(key);
      if (!prev || score > prev.score) bestAttempts.set(key, { score, max });
    }

    return userRows.map((u) => {
      let totalScore = 0;
      let totalMax = 0;

      const quizzes = quizRows.map((q) => {
        const best = bestAttempts.get(`${q.quizId}:${u.userId}`);
        if (best) {
          totalScore += best.score;
          totalMax += best.max;
        }
        return {
          quizId: q.quizId,
          batchId: q.batchId,
          title: q.title,
          scorePercent:
            best !== undefined
              ? best.max > 0
                ? Number(((best.score / best.max) * 100).toFixed(1))
                : 0
              : null,
          attempted: best !== undefined,
        };
      });

      return {
        userId: u.userId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        averageScorePercent:
          totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(1)) : null,
        quizzes,
      };
    });
  }
}
