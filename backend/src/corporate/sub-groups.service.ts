import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { AuditLogService } from '../audit/audit-log.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  corporateSeats,
  corporateSubGroupMembers,
  corporateSubGroups,
} from '../database/schema';

@Injectable()
export class SubGroupsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly audit: AuditLogService,
  ) {}

  async create(contractId: string, name: string, actorId: string) {
    const [created] = await this.db
      .insert(corporateSubGroups)
      .values({ contractId, name, createdBy: actorId })
      .returning();

    await this.audit.record({
      action: 'corporate.subgroup.create',
      targetType: 'sub_group',
      targetId: created.subGroupId,
      after: { contractId, name },
    });

    return created;
  }

  async list(contractId: string) {
    return this.db
      .select()
      .from(corporateSubGroups)
      .where(eq(corporateSubGroups.contractId, contractId))
      .orderBy(corporateSubGroups.name);
  }

  async delete(subGroupId: string, contractId: string) {
    const [deleted] = await this.db
      .delete(corporateSubGroups)
      .where(
        and(
          eq(corporateSubGroups.subGroupId, subGroupId),
          eq(corporateSubGroups.contractId, contractId),
        ),
      )
      .returning();

    if (!deleted) throw new NotFoundException('Sub-group not found');

    await this.db
      .delete(corporateSubGroupMembers)
      .where(eq(corporateSubGroupMembers.subGroupId, subGroupId));

    await this.audit.record({
      action: 'corporate.subgroup.delete',
      targetType: 'sub_group',
      targetId: subGroupId,
      before: { contractId, name: deleted.name },
    });

    return { deleted: true };
  }

  async addMember(
    subGroupId: string,
    contractId: string,
    userId: string,
    actorId: string,
  ) {
    const [subGroup] = await this.db
      .select()
      .from(corporateSubGroups)
      .where(
        and(
          eq(corporateSubGroups.subGroupId, subGroupId),
          eq(corporateSubGroups.contractId, contractId),
        ),
      )
      .limit(1);

    if (!subGroup) throw new NotFoundException('Sub-group not found');

    const [seat] = await this.db
      .select({ seatId: corporateSeats.seatId })
      .from(corporateSeats)
      .where(
        and(
          eq(corporateSeats.contractId, contractId),
          eq(corporateSeats.userId, userId),
          isNull(corporateSeats.releasedAt),
        ),
      )
      .limit(1);

    if (!seat) throw new NotFoundException('Student is not on this contract roster');

    const existing = await this.db
      .select({ subGroupMemberId: corporateSubGroupMembers.subGroupMemberId })
      .from(corporateSubGroupMembers)
      .where(
        and(
          eq(corporateSubGroupMembers.subGroupId, subGroupId),
          eq(corporateSubGroupMembers.userId, userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Student is already in this sub-group');
    }

    const [member] = await this.db
      .insert(corporateSubGroupMembers)
      .values({ subGroupId, contractId, userId, addedBy: actorId })
      .returning();

    await this.audit.record({
      action: 'corporate.subgroup.member.add',
      targetType: 'sub_group_member',
      targetId: subGroupId,
      after: { userId, subGroupId },
    });

    return member;
  }

  async removeMember(subGroupId: string, contractId: string, userId: string) {
    const [subGroup] = await this.db
      .select()
      .from(corporateSubGroups)
      .where(
        and(
          eq(corporateSubGroups.subGroupId, subGroupId),
          eq(corporateSubGroups.contractId, contractId),
        ),
      )
      .limit(1);

    if (!subGroup) throw new NotFoundException('Sub-group not found');

    const [deleted] = await this.db
      .delete(corporateSubGroupMembers)
      .where(
        and(
          eq(corporateSubGroupMembers.subGroupId, subGroupId),
          eq(corporateSubGroupMembers.userId, userId),
        ),
      )
      .returning();

    if (!deleted) throw new NotFoundException('Member not found in sub-group');

    await this.audit.record({
      action: 'corporate.subgroup.member.remove',
      targetType: 'sub_group_member',
      targetId: subGroupId,
      before: { userId, subGroupId },
    });

    return { removed: true };
  }

  async removeUserFromAllSubGroups(contractId: string, userId: string) {
    const removed = await this.db
      .delete(corporateSubGroupMembers)
      .where(
        and(
          eq(corporateSubGroupMembers.contractId, contractId),
          eq(corporateSubGroupMembers.userId, userId),
        ),
      )
      .returning({ subGroupId: corporateSubGroupMembers.subGroupId });

    if (removed.length > 0) {
      await this.audit.record({
        action: 'corporate.subgroup.member.remove',
        targetType: 'sub_group_member',
        targetId: contractId,
        before: { userId, reason: 'seat_released' },
      });
    }
  }
}
