import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { parentLinks, users } from '../database/schema';
import { CreateParentLinkDto } from './dto/create-parent-link.dto';

@Injectable()
export class ParentLinkService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async createLink(parentUserId: string, dto: CreateParentLinkDto) {
    const [student] = await this.db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.userId, dto.studentUserId))
      .limit(1);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const now = this.clock.now();
    const [inserted] = await this.db
      .insert(parentLinks)
      .values({
        parentUserId,
        studentUserId: dto.studentUserId,
        status: 'PENDING',
        requestedAt: now,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      return inserted;
    }

    const [existing] = await this.db
      .select()
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.parentUserId, parentUserId),
          eq(parentLinks.studentUserId, dto.studentUserId),
        ),
      )
      .limit(1);

    return existing;
  }

  async listLinks(parentUserId: string) {
    return this.db
      .select()
      .from(parentLinks)
      .where(eq(parentLinks.parentUserId, parentUserId));
  }

  async revoke(linkId: string, requestingUserId: string) {
    const [link] = await this.db
      .select()
      .from(parentLinks)
      .where(eq(parentLinks.linkId, linkId))
      .limit(1);

    if (!link) throw new NotFoundException('Link not found');
    if (
      link.parentUserId !== requestingUserId &&
      link.studentUserId !== requestingUserId
    ) {
      throw new ForbiddenException('Not your link');
    }

    const now = this.clock.now();
    await this.db
      .update(parentLinks)
      .set({ status: 'REVOKED', revokedAt: now, revokedBy: requestingUserId })
      .where(eq(parentLinks.linkId, linkId));

    return { revoked: true };
  }

  async accept(linkId: string, studentUserId: string) {
    const [link] = await this.db
      .select()
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.linkId, linkId),
          eq(parentLinks.studentUserId, studentUserId),
        ),
      )
      .limit(1);

    if (!link) throw new NotFoundException('Link request not found');
    if (link.status !== 'PENDING') {
      throw new BadRequestException('Link is not pending');
    }

    const now = this.clock.now();
    await this.db
      .update(parentLinks)
      .set({ status: 'ACTIVE', consentedAt: now })
      .where(eq(parentLinks.linkId, linkId));

    return { accepted: true };
  }

  async reject(linkId: string, studentUserId: string) {
    const [link] = await this.db
      .select()
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.linkId, linkId),
          eq(parentLinks.studentUserId, studentUserId),
        ),
      )
      .limit(1);

    if (!link) throw new NotFoundException('Link request not found');
    if (link.status !== 'PENDING') {
      throw new BadRequestException('Link is not pending');
    }

    const now = this.clock.now();
    await this.db
      .update(parentLinks)
      .set({ status: 'REVOKED', revokedAt: now, revokedBy: studentUserId })
      .where(eq(parentLinks.linkId, linkId));

    return { rejected: true };
  }

  async listStudentRequests(studentUserId: string) {
    return this.db
      .select()
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.studentUserId, studentUserId),
          eq(parentLinks.status, 'PENDING'),
        ),
      );
  }
}
