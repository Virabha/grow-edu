import {
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { AuditLogService } from '../audit/audit-log.service';
import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  batchEnrollments,
  corporateContractBatches,
  corporateContracts,
  corporateRosterUploads,
  corporateSeats,
  users,
} from '../database/schema';
import { Transaction } from '../database/transaction';
import { JOB_QUEUE, JobQueue } from '../jobs/job-queue';
import {
  acceptsSeatClaims,
  effectiveStatus,
} from './contract-lifecycle';
import { ROSTER_UPLOAD_NOT_FOUND } from './corporate.errors';
import { BulkUploadRowDto } from './dto/bulk-roster-upload.dto';
import { SeatsService } from './seats.service';

const BULK_ROSTER_JOB = 'corporate.bulk-roster';
const PASSWORD_COST = 10;

type BulkJobPayload = {
  uploadId: string;
  contractId: string;
  actorId: string;
  rows: BulkUploadRowDto[];
};

type RowStatus =
  | 'ADDED'
  | 'EXISTING'
  | 'INVALID'
  | 'SEAT_POOL_EXHAUSTED'
  | 'CONTRACT_NOT_ACTIVE';

type RowResult = {
  row: number;
  email: string | null;
  status: RowStatus;
  reason?: string;
};

function isValidEmail(value: string | null | undefined): value is string {
  if (!value || typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

@Injectable()
export class RosterService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly audit: AuditLogService,
    private readonly seats: SeatsService,
  ) {}

  onModuleInit() {
    this.jobs.register<BulkJobPayload>(
      BULK_ROSTER_JOB,
      (payload) => this.processBulkUpload(payload),
    );
  }

  async addMember(
    contractId: string,
    adminId: string,
    email: string,
    firstName: string | undefined,
    lastName: string | undefined,
  ) {
    const normalised = email.trim().toLowerCase();

    const [existing] = await this.db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.email, normalised))
      .limit(1);

    let userId: string;

    if (existing) {
      userId = existing.userId;
    } else {
      const [created] = await this.db
        .insert(users)
        .values({
          email: normalised,
          password: await bcrypt.hash(crypto.randomUUID(), PASSWORD_COST),
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          role: 'LEARNER',
          emailVerified: false,
        })
        .returning({ userId: users.userId });
      userId = created.userId;
    }

    const result = await this.seats.claimSeatDirectly(contractId, userId);

    await this.audit.record({
      action: 'corporate.roster.add',
      targetType: 'corporate_seat',
      targetId: contractId,
      after: { userId, email: normalised, adminId },
    });

    return { ...result, userId, email: normalised };
  }

  async removeMember(
    contractId: string,
    userId: string,
    adminId: string,
    reason?: string,
  ) {
    const result = await this.seats.release(contractId, userId, adminId, reason);

    await this.audit.record({
      action: 'corporate.roster.remove',
      targetType: 'corporate_seat',
      targetId: contractId,
      before: { userId, adminId, reason: reason ?? null },
    });

    return result;
  }

  async startBulkUpload(
    contractId: string,
    adminId: string,
    rows: BulkUploadRowDto[],
  ) {
    const [upload] = await this.db
      .insert(corporateRosterUploads)
      .values({
        contractId,
        actorId: adminId,
        status: 'PROCESSING',
        rowCount: rows.length,
      })
      .returning({ uploadId: corporateRosterUploads.uploadId });

    await this.jobs.enqueue<BulkJobPayload>(BULK_ROSTER_JOB, {
      uploadId: upload.uploadId,
      contractId,
      actorId: adminId,
      rows,
    });

    return { uploadId: upload.uploadId, status: 'PROCESSING', rowCount: rows.length };
  }

  async getUploadResult(uploadId: string, contractId: string) {
    const [record] = await this.db
      .select()
      .from(corporateRosterUploads)
      .where(
        and(
          eq(corporateRosterUploads.uploadId, uploadId),
          eq(corporateRosterUploads.contractId, contractId),
        ),
      )
      .limit(1);

    if (!record) {
      throw new NotFoundException({ code: ROSTER_UPLOAD_NOT_FOUND });
    }

    return record;
  }

  private async processBulkUpload(payload: BulkJobPayload) {
    const { uploadId, contractId, actorId, rows } = payload;

    const results: RowResult[] = rows.map((row, i) => ({
      row: i,
      email: row.email ?? null,
      status: 'INVALID' as RowStatus,
      reason: 'Email is required and must be a valid address',
    }));

    const validIndices: number[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      if (isValidEmail(rows[i].email)) {
        results[i] = { row: i, email: rows[i].email as string, status: 'INVALID' };
        validIndices.push(i);
      }
    }

    if (validIndices.length > 0) {
      await this.processValidRows(contractId, actorId, rows, validIndices, results);
    }

    await this.db
      .update(corporateRosterUploads)
      .set({
        status: 'DONE',
        rowResults: results,
        processedAt: this.clock.now(),
      })
      .where(eq(corporateRosterUploads.uploadId, uploadId));

    await this.audit.record({
      action: 'corporate.roster.bulk-upload',
      targetType: 'corporate_seat',
      targetId: contractId,
      after: {
        uploadId,
        actorId,
        added: results.filter((r) => r.status === 'ADDED').length,
        existing: results.filter((r) => r.status === 'EXISTING').length,
        invalid: results.filter((r) => r.status === 'INVALID').length,
        poolExhausted: results.filter((r) => r.status === 'SEAT_POOL_EXHAUSTED').length,
      },
    });
  }

  private async processValidRows(
    contractId: string,
    actorId: string,
    rows: BulkUploadRowDto[],
    validIndices: number[],
    results: RowResult[],
  ) {
    const validEmails = validIndices.map((i) => (rows[i].email as string).trim().toLowerCase());

    const existingUsers = await this.db
      .select({ userId: users.userId, email: users.email })
      .from(users)
      .where(inArray(users.email, validEmails));

    const emailToUserId = new Map(existingUsers.map((u) => [u.email, u.userId]));

    const newEmailIndices: number[] = [];
    const newHashedPasswords: string[] = [];

    for (const i of validIndices) {
      const email = (rows[i].email as string).trim().toLowerCase();
      if (!emailToUserId.has(email)) {
        newEmailIndices.push(i);
        newHashedPasswords.push(await bcrypt.hash(crypto.randomUUID(), PASSWORD_COST));
      }
    }

    await this.db.transaction(async (tx) => {
      const locked = await tx.execute<{ contract_id: string }>(
        sql`SELECT contract_id FROM corporate_contracts
            WHERE contract_id = ${contractId}
            FOR UPDATE`,
      );
      if (!locked[0]) {
        for (const i of validIndices) {
          results[i] = {
            row: i,
            email: results[i].email,
            status: 'CONTRACT_NOT_ACTIVE',
            reason: 'Contract not found',
          };
        }
        return;
      }

      const [contract] = await tx
        .select({
          contractId: corporateContracts.contractId,
          seatCount: corporateContracts.seatCount,
          status: corporateContracts.status,
          endsAt: corporateContracts.endsAt,
        })
        .from(corporateContracts)
        .where(eq(corporateContracts.contractId, contractId))
        .limit(1);

      const effectiveContractStatus = effectiveStatus(
        contract.status,
        contract.endsAt,
        this.clock.epochMillis(),
      );
      if (!acceptsSeatClaims(effectiveContractStatus)) {
        for (const i of validIndices) {
          results[i] = {
            row: i,
            email: results[i].email,
            status: 'CONTRACT_NOT_ACTIVE',
            reason: `Contract is ${effectiveContractStatus}`,
          };
        }
        return;
      }

      for (let k = 0; k < newEmailIndices.length; k += 1) {
        const i = newEmailIndices[k];
        const email = (rows[i].email as string).trim().toLowerCase();
        const [created] = await tx
          .insert(users)
          .values({
            email,
            password: newHashedPasswords[k],
            firstName: rows[i].firstName ?? null,
            lastName: rows[i].lastName ?? null,
            role: 'LEARNER',
            emailVerified: false,
          })
          .onConflictDoNothing()
          .returning({ userId: users.userId });

        if (created) {
          emailToUserId.set(email, created.userId);
        } else {
          const [found] = await tx
            .select({ userId: users.userId })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          if (found) emailToUserId.set(email, found.userId);
        }
      }

      const allUserIds = [...emailToUserId.values()];
      const existingSeats = allUserIds.length > 0
        ? await tx
            .select({ userId: corporateSeats.userId })
            .from(corporateSeats)
            .where(
              and(
                eq(corporateSeats.contractId, contractId),
                inArray(corporateSeats.userId, allUserIds),
                isNull(corporateSeats.releasedAt),
              ),
            )
        : [];

      const alreadySeated = new Set(existingSeats.map((s) => s.userId));

      const [countRow] = await tx
        .select({ claimed: sql<number>`count(*)::int` })
        .from(corporateSeats)
        .where(
          and(
            eq(corporateSeats.contractId, contractId),
            isNull(corporateSeats.releasedAt),
          ),
        );
      const currentClaimed = Number(countRow?.claimed ?? 0);
      const remaining = contract.seatCount - currentClaimed;

      const toAddIndices: number[] = [];
      for (const i of validIndices) {
        const email = (rows[i].email as string).trim().toLowerCase();
        const userId = emailToUserId.get(email);
        if (userId && alreadySeated.has(userId)) {
          results[i] = { row: i, email, status: 'EXISTING' };
        } else if (userId) {
          toAddIndices.push(i);
        }
      }

      if (toAddIndices.length > remaining) {
        for (const i of toAddIndices) {
          results[i] = {
            row: i,
            email: results[i].email,
            status: 'SEAT_POOL_EXHAUSTED',
            reason: `Only ${remaining} seat(s) remaining but ${toAddIndices.length} new member(s) requested`,
          };
        }
        return;
      }

      if (toAddIndices.length > 0) {
        const seatValues = toAddIndices.map((i) => {
          const email = (rows[i].email as string).trim().toLowerCase();
          return {
            contractId,
            userId: emailToUserId.get(email) as string,
          };
        });

        await tx.insert(corporateSeats).values(seatValues);

        const batchIds = await this.contractBatchIds(tx, contractId);
        if (batchIds.length > 0) {
          const enrollmentValues = toAddIndices.flatMap((i) => {
            const email = (rows[i].email as string).trim().toLowerCase();
            const userId = emailToUserId.get(email) as string;
            return batchIds.map((batchId) => ({
              batchId,
              userId,
              status: 'ACTIVE' as const,
              source: 'CORPORATE_SEAT' as const,
              accessEndsAt: contract.endsAt,
            }));
          });

          await tx
            .insert(batchEnrollments)
            .values(enrollmentValues)
            .onConflictDoUpdate({
              target: [batchEnrollments.batchId, batchEnrollments.userId],
              set: {
                status: 'ACTIVE',
                source: 'CORPORATE_SEAT',
                accessEndsAt: contract.endsAt,
                updatedAt: new Date(),
              },
            });
        }

        for (const i of toAddIndices) {
          const email = (rows[i].email as string).trim().toLowerCase();
          results[i] = { row: i, email, status: 'ADDED' };
        }

        await this.audit.record({
          action: 'corporate.roster.bulk-add',
          targetType: 'corporate_seat',
          targetId: contractId,
          after: { actorId, count: toAddIndices.length },
          tx,
        });
      }
    });
  }

  private async contractBatchIds(tx: Transaction, contractId: string): Promise<string[]> {
    const rows = await tx
      .select({ batchId: corporateContractBatches.batchId })
      .from(corporateContractBatches)
      .where(eq(corporateContractBatches.contractId, contractId));
    return rows.map((r) => r.batchId);
  }
}
