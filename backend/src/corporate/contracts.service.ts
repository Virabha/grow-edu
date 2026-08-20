import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  batches,
  companies,
  corporateContractBatches,
  corporateContracts,
  corporateSeats,
  payments,
} from '../database/schema';
import { Queryable } from '../database/transaction';
import { daysUntil, effectiveStatus } from './contract-lifecycle';
import { CreateContractDto } from './dto/create-contract.dto';
import { ListContractsDto } from './dto/list-contracts.dto';
import { RecordContractPaymentDto } from './dto/record-contract-payment.dto';

@Injectable()
export class ContractsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(dto: CreateContractDto, actingAdminId: string) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const [company] = await this.db
      .select({ companyId: companies.companyId })
      .from(companies)
      .where(eq(companies.companyId, dto.companyId))
      .limit(1);
    if (!company) throw new NotFoundException('Company not found');

    const [created] = await this.db
      .insert(corporateContracts)
      .values({
        companyId: dto.companyId,
        title: dto.title,
        seatCount: dto.seatCount,
        startsAt,
        endsAt,
        notes: dto.notes ?? null,
        createdBy: actingAdminId,
      })
      .returning();

    return created;
  }

  async findOneOrThrow(contractId: string) {
    const [contract] = await this.db
      .select()
      .from(corporateContracts)
      .where(eq(corporateContracts.contractId, contractId))
      .limit(1);
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async batchesOn(contractId: string) {
    return this.db
      .select({
        batchId: batches.batchId,
        title: batches.title,
        slug: batches.slug,
      })
      .from(corporateContractBatches)
      .innerJoin(
        batches,
        eq(batches.batchId, corporateContractBatches.batchId),
      )
      .where(eq(corporateContractBatches.contractId, contractId));
  }

  async findOne(contractId: string) {
    const contract = await this.findOneOrThrow(contractId);
    const claimed = await this.claimedCounts([contractId]);
    return {
      ...this.summarise(contract, claimed.get(contractId) ?? 0),
      batches: await this.batchesOn(contractId),
    };
  }

  async list(filters: ListContractsDto) {
    const rows = await this.db
      .select()
      .from(corporateContracts)
      .where(
        filters.companyId
          ? eq(corporateContracts.companyId, filters.companyId)
          : undefined,
      )
      .orderBy(corporateContracts.endsAt);

    if (rows.length === 0) return [];

    const claimed = await this.claimedCounts(rows.map((r) => r.contractId));
    const summarised = rows.map((row) =>
      this.summarise(row, claimed.get(row.contractId) ?? 0),
    );

    if (filters.expiringWithinDays === undefined) return summarised;

    return summarised.filter(
      (c) =>
        c.daysUntilExpiry > 0 &&
        c.daysUntilExpiry <= (filters.expiringWithinDays as number),
    );
  }

  async cancel(contractId: string, reason?: string) {
    const contract = await this.findOneOrThrow(contractId);
    if (contract.status !== 'CANCELLED') {
      await this.db
        .update(corporateContracts)
        .set({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          notes: reason ?? contract.notes,
          updatedAt: new Date(),
        })
        .where(eq(corporateContracts.contractId, contractId));
    }
    return this.findOne(contractId);
  }

  async claimedCounts(contractIds: string[]): Promise<Map<string, number>> {
    if (contractIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        contractId: corporateSeats.contractId,
        claimed: sql<number>`count(*)::int`,
      })
      .from(corporateSeats)
      .where(
        and(
          inArray(corporateSeats.contractId, contractIds),
          isNull(corporateSeats.releasedAt),
        ),
      )
      .groupBy(corporateSeats.contractId);

    return new Map(rows.map((r) => [r.contractId, Number(r.claimed)]));
  }

  summarise(
    contract: typeof corporateContracts.$inferSelect,
    seatsClaimed: number,
  ) {
    const now = Date.now();
    return {
      ...contract,
      status: effectiveStatus(contract.status, contract.endsAt, now),
      storedStatus: contract.status,
      daysUntilExpiry: daysUntil(contract.endsAt, now),
      seatsClaimed,
      seatsRemaining: Math.max(0, contract.seatCount - seatsClaimed),
    };
  }

  async setBatches(contractId: string, batchIds: string[]) {
    await this.findOneOrThrow(contractId);

    if (batchIds.length > 0) {
      const found = await this.db
        .select({ batchId: batches.batchId })
        .from(batches)
        .where(
          and(inArray(batches.batchId, batchIds), eq(batches.isDeleted, false)),
        );
      if (found.length !== batchIds.length) {
        const known = new Set(found.map((b) => b.batchId));
        const missing = batchIds.filter((id) => !known.has(id));
        throw new NotFoundException(
          `Unknown batch: ${missing.join(', ')}`,
        );
      }
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(corporateContractBatches)
        .where(eq(corporateContractBatches.contractId, contractId));
      if (batchIds.length > 0) {
        await tx
          .insert(corporateContractBatches)
          .values(batchIds.map((batchId) => ({ contractId, batchId })));
      }
    });

    return this.findOne(contractId);
  }

  async recordPayment(
    contractId: string,
    dto: RecordContractPaymentDto,
    actingAdminId: string,
  ) {
    const contract = await this.findOneOrThrow(contractId);
    if (contract.status !== 'DRAFT' && contract.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException(
        `Cannot record a payment against a ${contract.status} contract`,
      );
    }

    return this.db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(payments)
        .values({
          userId: actingAdminId,
          corporateContractId: contractId,
          itemType: 'CORPORATE_CONTRACT',
          amount: dto.amount.toFixed(2),
          currency: 'INR',
          gateway: 'MANUAL_QR',
          status: dto.paymentProofUrl ? 'PROOF_UPLOADED' : 'PENDING',
          payerName: dto.payerName ?? null,
          transactionId: dto.transactionId ?? null,
          paymentProofUrl: dto.paymentProofUrl ?? null,
          proofUploadedAt: dto.paymentProofUrl ? new Date() : null,
        })
        .returning();

      await tx
        .update(corporateContracts)
        .set({
          status: 'AWAITING_PAYMENT',
          paymentId: payment.paymentId,
          updatedAt: new Date(),
        })
        .where(eq(corporateContracts.contractId, contractId));

      return payment;
    });
  }

  async activateForPayment(
    contractId: string,
    tx: Queryable = this.db,
  ): Promise<void> {
    await tx
      .update(corporateContracts)
      .set({ status: 'ACTIVE', activatedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(corporateContracts.contractId, contractId),
          inArray(corporateContracts.status, ['DRAFT', 'AWAITING_PAYMENT']),
        ),
      );
  }
}
