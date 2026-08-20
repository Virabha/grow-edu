import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { corporateJoinLinks } from '../database/schema';
import { ContractsService } from './contracts.service';
import { IssueJoinLinkDto } from './dto/issue-join-link.dto';

const DEFAULT_VALID_DAYS = 30;
const TOKEN_BYTES = 32;

export function hashJoinToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class JoinLinksService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly contracts: ContractsService,
  ) {}

  async issue(contractId: string, dto: IssueJoinLinkDto, actingAdminId: string) {
    const contract = await this.contracts.findOneOrThrow(contractId);

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : defaultExpiry(contract.endsAt);
    if (expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    const token = randomBytes(TOKEN_BYTES).toString('base64url');

    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ generation: corporateJoinLinks.generation })
        .from(corporateJoinLinks)
        .where(eq(corporateJoinLinks.contractId, contractId))
        .orderBy(desc(corporateJoinLinks.generation))
        .limit(1);

      const [created] = await tx
        .insert(corporateJoinLinks)
        .values({
          contractId,
          tokenHash: hashJoinToken(token),
          generation: (current?.generation ?? 0) + 1,
          expiresAt,
          createdBy: actingAdminId,
        })
        .returning({
          joinLinkId: corporateJoinLinks.joinLinkId,
          generation: corporateJoinLinks.generation,
          expiresAt: corporateJoinLinks.expiresAt,
        });

      return { ...created, contractId, token };
    });
  }

  async revokeAll(contractId: string, actingAdminId: string) {
    await this.contracts.findOneOrThrow(contractId);
    const revoked = await this.db
      .update(corporateJoinLinks)
      .set({ revokedAt: new Date(), revokedBy: actingAdminId })
      .where(
        and(
          eq(corporateJoinLinks.contractId, contractId),
          isNull(corporateJoinLinks.revokedAt),
        ),
      )
      .returning({ joinLinkId: corporateJoinLinks.joinLinkId });

    return { revoked: revoked.length };
  }

  async listFor(contractId: string) {
    return this.db
      .select({
        joinLinkId: corporateJoinLinks.joinLinkId,
        generation: corporateJoinLinks.generation,
        expiresAt: corporateJoinLinks.expiresAt,
        revokedAt: corporateJoinLinks.revokedAt,
        createdAt: corporateJoinLinks.createdAt,
      })
      .from(corporateJoinLinks)
      .where(eq(corporateJoinLinks.contractId, contractId))
      .orderBy(desc(corporateJoinLinks.generation));
  }
}

function defaultExpiry(contractEndsAt: Date): Date {
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + DEFAULT_VALID_DAYS);
  return contractEndsAt < fallback ? contractEndsAt : fallback;
}
