import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  batchEnrollments,
  corporateContractBatches,
  corporateContracts,
  corporateJoinLinks,
  corporateSeats,
  users,
} from '../database/schema';
import { ClaimSeatDto } from './dto/claim-seat.dto';
import { Transaction } from '../database/transaction';
import {
  acceptsSeatClaims,
  ContractStatus,
  effectiveStatus,
} from './contract-lifecycle';
import {
  ACCOUNT_EXISTS,
  CONTRACT_NOT_ACTIVE,
  JOIN_LINK_EXPIRED,
  JOIN_LINK_NOT_FOUND,
  JOIN_LINK_REVOKED,
  SEAT_ALREADY_CLAIMED,
  SEAT_POOL_EXHAUSTED,
} from './corporate.errors';
import { hashJoinToken } from './join-links.service';

const PASSWORD_COST = 10;

type LockedContract = {
  contractId: string;
  seatCount: number;
  status: ContractStatus;
  endsAt: Date;
};

@Injectable()
export class SeatsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async redeem(token: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const link = await this.resolveLink(tx, token);
      return this.claimSeat(tx, link, userId);
    });
  }

  async claimWithNewAccount(dto: ClaimSeatDto) {
    return this.db.transaction(async (tx) => {
      const link = await this.resolveLink(tx, dto.token);

      const [taken] = await tx
        .select({ userId: users.userId })
        .from(users)
        .where(eq(users.email, dto.email))
        .limit(1);
      if (taken) {
        throw new ConflictException({
          code: ACCOUNT_EXISTS,
          message:
            'An account already uses this email. Sign in, then open the join link again.',
        });
      }

      const [created] = await tx
        .insert(users)
        .values({
          email: dto.email,
          password: await bcrypt.hash(dto.password, PASSWORD_COST),
          firstName: dto.firstName ?? null,
          lastName: dto.lastName ?? null,
          role: 'LEARNER',
          emailVerified: false,
        })
        .returning({ userId: users.userId });

      const claimed = await this.claimSeat(tx, link, created.userId);
      return { ...claimed, userId: created.userId, email: dto.email };
    });
  }

  private async claimSeat(
    tx: Transaction,
    link: { contractId: string; joinLinkId: string },
    userId: string,
  ) {
    const contract = await this.lockContract(tx, link.contractId);

    const status = effectiveStatus(
      contract.status,
      contract.endsAt,
      Date.now(),
    );
    if (!acceptsSeatClaims(status)) {
      throw new ForbiddenException({
        code: CONTRACT_NOT_ACTIVE,
        message:
          'This college’s contract is not active. Contact your college administrator.',
        contractStatus: status,
      });
    }

    const [held] = await tx
      .select({ seatId: corporateSeats.seatId })
      .from(corporateSeats)
      .where(
        and(
          eq(corporateSeats.contractId, link.contractId),
          eq(corporateSeats.userId, userId),
          isNull(corporateSeats.releasedAt),
        ),
      )
      .limit(1);
    if (held) {
      throw new ConflictException({
        code: SEAT_ALREADY_CLAIMED,
        message: 'You have already joined with this link.',
      });
    }

    const claimed = await this.countClaimed(tx, link.contractId);
    if (claimed >= contract.seatCount) {
      throw new ConflictException({
        code: SEAT_POOL_EXHAUSTED,
        message:
          'Every seat your college bought has been claimed. Contact your college administrator.',
        seatCount: contract.seatCount,
      });
    }

    const [seat] = await tx
      .insert(corporateSeats)
      .values({
        contractId: link.contractId,
        userId,
        joinLinkId: link.joinLinkId,
      })
      .returning({
        seatId: corporateSeats.seatId,
        claimedAt: corporateSeats.claimedAt,
      });

    const enrolledBatchIds = await this.enrolIntoContractBatches(
      tx,
      link.contractId,
      userId,
      contract.endsAt,
    );

    return {
      seatId: seat.seatId,
      contractId: link.contractId,
      claimedAt: seat.claimedAt,
      seatsRemaining: contract.seatCount - (claimed + 1),
      batchIds: enrolledBatchIds,
    };
  }

  async release(contractId: string, userId: string, actingAdminId: string, reason?: string) {
    return this.db.transaction(async (tx) => {
      const [seat] = await tx
        .update(corporateSeats)
        .set({
          releasedAt: new Date(),
          releasedBy: actingAdminId,
          releaseReason: reason ?? null,
        })
        .where(
          and(
            eq(corporateSeats.contractId, contractId),
            eq(corporateSeats.userId, userId),
            isNull(corporateSeats.releasedAt),
          ),
        )
        .returning({ seatId: corporateSeats.seatId });

      if (!seat) {
        throw new NotFoundException('This student does not hold a seat on this contract');
      }

      const batchIds = await this.contractBatchIds(tx, contractId);

      if (batchIds.length > 0) {
        await tx
          .update(batchEnrollments)
          .set({ status: 'REVOKED', updatedAt: new Date() })
          .where(
            and(
              eq(batchEnrollments.userId, userId),
              inArray(batchEnrollments.batchId, batchIds),
              isNull(batchEnrollments.paymentId),
            ),
          );
      }

      return { released: true, seatId: seat.seatId, batchIds };
    });
  }

  private async resolveLink(tx: Transaction, token: string) {
    const [link] = await tx
      .select()
      .from(corporateJoinLinks)
      .where(eq(corporateJoinLinks.tokenHash, hashJoinToken(token)))
      .limit(1);

    if (!link) {
      throw new NotFoundException({
        code: JOIN_LINK_NOT_FOUND,
        message:
          'This join link is not recognised. Check it with your college administrator.',
      });
    }
    if (link.revokedAt) {
      throw new ForbiddenException({
        code: JOIN_LINK_REVOKED,
        message:
          'This join link has been withdrawn. Ask your college administrator for the current one.',
      });
    }
    if (link.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException({
        code: JOIN_LINK_EXPIRED,
        message:
          'This join link has expired. Ask your college administrator for a new one.',
        expiredAt: link.expiresAt.toISOString(),
      });
    }
    return link;
  }

  private async lockContract(
    tx: Transaction,
    contractId: string,
  ): Promise<LockedContract> {
    const locked = await tx.execute<{ contract_id: string }>(
      sql`select contract_id from corporate_contracts
          where contract_id = ${contractId}
          for update`,
    );
    if (!locked[0]) throw new NotFoundException('Contract not found');

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
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  private async countClaimed(
    tx: Transaction,
    contractId: string,
  ): Promise<number> {
    const [row] = await tx
      .select({ claimed: sql<number>`count(*)::int` })
      .from(corporateSeats)
      .where(
        and(
          eq(corporateSeats.contractId, contractId),
          isNull(corporateSeats.releasedAt),
        ),
      );
    return Number(row?.claimed ?? 0);
  }

  private async contractBatchIds(
    tx: Transaction,
    contractId: string,
  ): Promise<string[]> {
    const rows = await tx
      .select({ batchId: corporateContractBatches.batchId })
      .from(corporateContractBatches)
      .where(eq(corporateContractBatches.contractId, contractId));
    return rows.map((r) => r.batchId);
  }

  private async enrolIntoContractBatches(
    tx: Transaction,
    contractId: string,
    userId: string,
    accessEndsAt: Date,
  ): Promise<string[]> {
    const batchIds = await this.contractBatchIds(tx, contractId);
    if (batchIds.length === 0) return [];

    await tx
      .insert(batchEnrollments)
      .values(
        batchIds.map((batchId) => ({
          batchId,
          userId,
          status: 'ACTIVE' as const,
          source: 'CORPORATE_SEAT' as const,
          accessEndsAt,
        })),
      )
      .onConflictDoUpdate({
        target: [batchEnrollments.batchId, batchEnrollments.userId],
        set: {
          status: 'ACTIVE',
          source: 'CORPORATE_SEAT',
          accessEndsAt,
          updatedAt: new Date(),
        },
      });

    return batchIds;
  }
}
