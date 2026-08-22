import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  corporateContracts,
  corporateSeats,
  users,
} from '../database/schema';
import { ContractsService } from './contracts.service';

@Injectable()
export class CorporateAdminService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly contracts: ContractsService,
  ) {}

  private async companyIdOf(userId: string): Promise<string> {
    const [row] = await this.db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    if (!row?.companyId) {
      throw new ForbiddenException(
        'Your account is not linked to an organisation',
      );
    }
    return row.companyId;
  }

  async listMyContracts(userId: string) {
    const companyId = await this.companyIdOf(userId);

    const rows = await this.db
      .select()
      .from(corporateContracts)
      .where(eq(corporateContracts.companyId, companyId))
      .orderBy(desc(corporateContracts.createdAt));

    if (rows.length === 0) return [];

    const claimed = await this.contracts.claimedCounts(
      rows.map((r) => r.contractId),
    );

    return Promise.all(
      rows.map(async (contract) => {
        const summary = this.contracts.summarise(
          contract,
          claimed.get(contract.contractId) ?? 0,
        );
        return {
          contractId: summary.contractId,
          title: summary.title,
          status: summary.status,
          seatCount: summary.seatCount,
          seatsClaimed: summary.seatsClaimed,
          seatsRemaining: summary.seatsRemaining,
          daysUntilExpiry: summary.daysUntilExpiry,
          startsAt: summary.startsAt,
          endsAt: summary.endsAt,
          batches: await this.contracts.batchesOn(contract.contractId),
        };
      }),
    );
  }

  async myRoster(userId: string, contractId: string) {
    await this.assertOwns(userId, contractId);

    return this.db
      .select({
        userId: users.userId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        claimedAt: corporateSeats.claimedAt,
      })
      .from(corporateSeats)
      .innerJoin(users, eq(users.userId, corporateSeats.userId))
      .where(
        and(
          eq(corporateSeats.contractId, contractId),
          isNull(corporateSeats.releasedAt),
        ),
      )
      .orderBy(desc(corporateSeats.claimedAt));
  }

  async assertOwns(userId: string, contractId: string) {
    const companyId = await this.companyIdOf(userId);
    const [contract] = await this.db
      .select()
      .from(corporateContracts)
      .where(
        and(
          eq(corporateContracts.contractId, contractId),
          eq(corporateContracts.companyId, companyId),
        ),
      )
      .limit(1);
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

}
