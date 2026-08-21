import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { deriveAuthorKind } from './community.util';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { batchFeedPosts } from '../database/schema';
import { COMMUNITY_SETTINGS_GROUP } from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';
import { BatchAccessService, Viewer } from '../batches/access/batch-access.service';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
import { RemoveFeedPostDto } from './dto/remove-feed-post.dto';

type Post = typeof batchFeedPosts.$inferSelect;

type StudentPostView = Omit<Post, 'removedAt' | 'removedBy' | 'removalReason'>;

function toStudentView(post: Post): StudentPostView {
  const {
    removedAt: _removedAt,
    removedBy: _removedBy,
    removalReason: _removalReason,
    ...rest
  } = post;
  return rest;
}

@Injectable()
export class FeedService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
    private readonly settings: SettingsService,
  ) {}

  async listPosts(batchId: string, viewer: Viewer) {
    const isStaff = await this.access.isStaff(batchId, viewer);
    const conditions = [
      eq(batchFeedPosts.batchId, batchId),
      isNull(batchFeedPosts.parentPostId),
    ];
    if (!isStaff) {
      conditions.push(isNull(batchFeedPosts.removedAt));
    }
    const posts = await this.db
      .select()
      .from(batchFeedPosts)
      .where(and(...conditions))
      .orderBy(asc(batchFeedPosts.createdAt));

    return isStaff ? posts : posts.map(toStudentView);
  }

  async createPost(
    batchId: string,
    dto: CreateFeedPostDto,
    viewer: { userId: string; role: string },
  ) {
    const maxLength = await this.feedPostMaxLength();
    if (dto.body.length > maxLength) {
      throw new BadRequestException(
        `Post body must not exceed ${maxLength} characters`,
      );
    }
    const now = this.clock.now();
    const [post] = await this.db
      .insert(batchFeedPosts)
      .values({
        batchId,
        authorId: viewer.userId,
        authorKind: deriveAuthorKind(viewer.role),
        body: dto.body,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return post;
  }

  async listReplies(batchId: string, postId: string, viewer: Viewer) {
    const isStaff = await this.access.isStaff(batchId, viewer);
    await this.requirePost(batchId, postId, isStaff);
    const conditions = [
      eq(batchFeedPosts.batchId, batchId),
      eq(batchFeedPosts.parentPostId, postId),
    ];
    if (!isStaff) {
      conditions.push(isNull(batchFeedPosts.removedAt));
    }
    const replies = await this.db
      .select()
      .from(batchFeedPosts)
      .where(and(...conditions))
      .orderBy(asc(batchFeedPosts.createdAt));

    return isStaff ? replies : replies.map(toStudentView);
  }

  async createReply(
    batchId: string,
    postId: string,
    dto: CreateFeedPostDto,
    viewer: { userId: string; role: string },
  ) {
    const maxLength = await this.feedPostMaxLength();
    if (dto.body.length > maxLength) {
      throw new BadRequestException(
        `Post body must not exceed ${maxLength} characters`,
      );
    }
    const isStaff = await this.access.isStaff(batchId, viewer);
    await this.requirePost(batchId, postId, isStaff);
    const now = this.clock.now();
    const [reply] = await this.db
      .insert(batchFeedPosts)
      .values({
        batchId,
        parentPostId: postId,
        authorId: viewer.userId,
        authorKind: deriveAuthorKind(viewer.role),
        body: dto.body,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.db
      .update(batchFeedPosts)
      .set({
        replyCount: sql`${batchFeedPosts.replyCount} + 1`,
        updatedAt: now,
      })
      .where(eq(batchFeedPosts.postId, postId));

    return reply;
  }

  async removePost(
    batchId: string,
    postId: string,
    dto: RemoveFeedPostDto,
    removedBy: string,
  ) {
    await this.requirePost(batchId, postId, true);
    const now = this.clock.now();
    await this.db
      .update(batchFeedPosts)
      .set({
        removedAt: now,
        removedBy,
        removalReason: dto.reason ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(batchFeedPosts.batchId, batchId),
          eq(batchFeedPosts.postId, postId),
        ),
      );
    return { removed: true };
  }

  private async requirePost(
    batchId: string,
    postId: string,
    allowRemoved: boolean,
  ) {
    const conditions = [
      eq(batchFeedPosts.postId, postId),
      eq(batchFeedPosts.batchId, batchId),
    ];
    if (!allowRemoved) {
      conditions.push(isNull(batchFeedPosts.removedAt));
    }
    const [post] = await this.db
      .select({ postId: batchFeedPosts.postId })
      .from(batchFeedPosts)
      .where(and(...conditions))
      .limit(1);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private async feedPostMaxLength(): Promise<number> {
    const group = await this.settings.getGroup(COMMUNITY_SETTINGS_GROUP);
    const configured = Number(group.values.feedPostMaxLength);
    return Number.isFinite(configured) && configured > 0 ? configured : 2000;
  }
}
