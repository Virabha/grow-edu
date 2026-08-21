import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  studyGroupMembers,
  studyGroupMessages,
  studyGroups,
} from '../database/schema';
import { COMMUNITY_SETTINGS_GROUP } from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';
import { BatchAccessService, Viewer } from '../batches/access/batch-access.service';
import { CreateStudyGroupDto } from './dto/create-study-group.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { RemoveGroupMessageDto } from './dto/remove-group-message.dto';

type AuthorKind = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

function deriveAuthorKind(role: string): AuthorKind {
  if (role === 'PLATFORM_ADMIN') return 'ADMIN';
  if (role === 'INSTRUCTOR') return 'INSTRUCTOR';
  return 'STUDENT';
}

type Message = typeof studyGroupMessages.$inferSelect;
type StudentMessageView = Omit<Message, 'removedAt' | 'removedBy' | 'removalReason'>;

function toStudentMessageView(message: Message): StudentMessageView {
  const {
    removedAt: _removedAt,
    removedBy: _removedBy,
    removalReason: _removalReason,
    ...rest
  } = message;
  return rest;
}

@Injectable()
export class StudyGroupService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
    private readonly settings: SettingsService,
  ) {}

  async listGroups(batchId: string, viewer: Viewer) {
    const isStaff = await this.access.isStaff(batchId, viewer);
    if (isStaff) {
      return this.db
        .select()
        .from(studyGroups)
        .where(
          and(
            eq(studyGroups.batchId, batchId),
            eq(studyGroups.isDeleted, false),
          ),
        );
    }
    if (!viewer.userId) return [];
    const memberships = await this.db
      .select({ groupId: studyGroupMembers.groupId })
      .from(studyGroupMembers)
      .where(eq(studyGroupMembers.userId, viewer.userId));
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) return [];
    return this.db
      .select()
      .from(studyGroups)
      .where(
        and(
          eq(studyGroups.batchId, batchId),
          eq(studyGroups.isDeleted, false),
          inArray(studyGroups.groupId, groupIds),
        ),
      );
  }

  async createGroup(
    batchId: string,
    dto: CreateStudyGroupDto,
    viewer: { userId: string; role: string },
  ) {
    const { groupsPerBatch, memberCap } = await this.communitySettings();
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(studyGroups)
      .where(
        and(eq(studyGroups.batchId, batchId), eq(studyGroups.isDeleted, false)),
      );
    if (total >= groupsPerBatch) {
      throw new BadRequestException(
        `This batch already has the maximum number of study groups (${groupsPerBatch})`,
      );
    }
    const now = this.clock.now();
    const [group] = await this.db
      .insert(studyGroups)
      .values({
        batchId,
        name: dto.name,
        description: dto.description ?? null,
        memberCap,
        createdBy: viewer.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await this.db.insert(studyGroupMembers).values({
      groupId: group.groupId,
      batchId,
      userId: viewer.userId,
      joinedAt: now,
    });
    return group;
  }

  async getGroup(batchId: string, groupId: string, viewer: Viewer) {
    const group = await this.requireGroup(batchId, groupId);
    const isStaff = await this.access.isStaff(batchId, viewer);
    if (!isStaff) {
      if (!viewer.userId) throw new NotFoundException('Group not found');
      const isMember = await this.isMember(groupId, viewer.userId);
      if (!isMember) throw new NotFoundException('Group not found');
    }
    return group;
  }

  async joinGroup(
    batchId: string,
    groupId: string,
    viewer: { userId: string; role: string },
  ) {
    const group = await this.requireGroup(batchId, groupId);
    const isStaff = await this.access.isStaff(batchId, viewer);
    if (isStaff) {
      throw new BadRequestException('Staff do not join student study groups');
    }
    const alreadyMember = await this.isMember(groupId, viewer.userId);
    if (alreadyMember) {
      throw new ConflictException('Already a member of this group');
    }
    const [{ memberCount }] = await this.db
      .select({ memberCount: count() })
      .from(studyGroupMembers)
      .where(eq(studyGroupMembers.groupId, groupId));
    if (memberCount >= group.memberCap) {
      throw new BadRequestException(
        `This group is full (cap: ${group.memberCap})`,
      );
    }
    const now = this.clock.now();
    await this.db.insert(studyGroupMembers).values({
      groupId,
      batchId,
      userId: viewer.userId,
      joinedAt: now,
    });
    return { joined: true };
  }

  async listMessages(batchId: string, groupId: string, viewer: Viewer) {
    await this.requireGroup(batchId, groupId);
    const isStaff = await this.access.isStaff(batchId, viewer);
    if (!isStaff) {
      if (!viewer.userId) throw new NotFoundException('Group not found');
      const isMember = await this.isMember(groupId, viewer.userId);
      if (!isMember) throw new NotFoundException('Group not found');
    }
    const conditions = [eq(studyGroupMessages.groupId, groupId)];
    if (!isStaff) {
      conditions.push(isNull(studyGroupMessages.removedAt));
    }
    const messages = await this.db
      .select()
      .from(studyGroupMessages)
      .where(and(...conditions))
      .orderBy(asc(studyGroupMessages.createdAt));

    return isStaff ? messages : messages.map(toStudentMessageView);
  }

  async sendMessage(
    batchId: string,
    groupId: string,
    dto: SendGroupMessageDto,
    viewer: { userId: string; role: string },
  ) {
    await this.requireGroup(batchId, groupId);
    const isStaff = await this.access.isStaff(batchId, viewer);
    if (isStaff) {
      throw new ForbiddenException(
        'Staff communicate through the batch feed, not study groups',
      );
    }
    const isMember = await this.isMember(groupId, viewer.userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const maxLength = await this.messageMaxLength();
    if (dto.body.length > maxLength) {
      throw new BadRequestException(
        `Message body must not exceed ${maxLength} characters`,
      );
    }
    const now = this.clock.now();
    const [message] = await this.db
      .insert(studyGroupMessages)
      .values({
        groupId,
        batchId,
        authorId: viewer.userId,
        authorKind: deriveAuthorKind(viewer.role),
        body: dto.body,
        createdAt: now,
      })
      .returning();
    return message;
  }

  async removeMessage(
    batchId: string,
    groupId: string,
    messageId: string,
    dto: RemoveGroupMessageDto,
    removedBy: string,
  ) {
    await this.requireGroup(batchId, groupId);
    const [message] = await this.db
      .select({ messageId: studyGroupMessages.messageId })
      .from(studyGroupMessages)
      .where(
        and(
          eq(studyGroupMessages.messageId, messageId),
          eq(studyGroupMessages.groupId, groupId),
        ),
      )
      .limit(1);
    if (!message) throw new NotFoundException('Message not found');
    const now = this.clock.now();
    await this.db
      .update(studyGroupMessages)
      .set({
        removedAt: now,
        removedBy,
        removalReason: dto.reason ?? null,
      })
      .where(eq(studyGroupMessages.messageId, messageId));
    return { removed: true };
  }

  private async requireGroup(batchId: string, groupId: string) {
    const [group] = await this.db
      .select()
      .from(studyGroups)
      .where(
        and(
          eq(studyGroups.groupId, groupId),
          eq(studyGroups.batchId, batchId),
          eq(studyGroups.isDeleted, false),
        ),
      )
      .limit(1);
    if (!group) throw new NotFoundException('Study group not found');
    return group;
  }

  private async isMember(groupId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ membershipId: studyGroupMembers.membershipId })
      .from(studyGroupMembers)
      .where(
        and(
          eq(studyGroupMembers.groupId, groupId),
          eq(studyGroupMembers.userId, userId),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  private async communitySettings() {
    const group = await this.settings.getGroup(COMMUNITY_SETTINGS_GROUP);
    const memberCap = Number(group.values.studyGroupMemberCap);
    const groupsPerBatch = Number(group.values.studyGroupsPerBatch);
    return {
      memberCap: Number.isFinite(memberCap) && memberCap > 0 ? memberCap : 8,
      groupsPerBatch:
        Number.isFinite(groupsPerBatch) && groupsPerBatch > 0
          ? groupsPerBatch
          : 20,
    };
  }

  private async messageMaxLength(): Promise<number> {
    const group = await this.settings.getGroup(COMMUNITY_SETTINGS_GROUP);
    const configured = Number(group.values.feedPostMaxLength);
    return Number.isFinite(configured) && configured > 0 ? configured : 2000;
  }
}
