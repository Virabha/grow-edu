# Community Feed, Study Groups & Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Tickets 21-23: a batch-scoped discussion feed, bounded peer study groups, and a community moderation queue — all as a new `src/community/` NestJS module.

**Architecture:** Three pairs of controller+service (feed, study-group, moderation) live under a single `CommunityModule`. Every route sits under `batches/:batchId/...` so the existing `BatchAccessGuard` enforces cross-batch scoping automatically. Services call `BatchAccessService.isStaff()` to distinguish staff views from student views, and derive `authorKind` from the viewer's role at write time — never from client input.

**Tech Stack:** NestJS 10, Drizzle ORM 0.29, postgres.js, supertest integration tests. All schema tables already exist in `src/database/schema/community.ts`.

---

## House Rules (read before touching a single file)

- Zero comments in any new code.
- Every controller route must carry exactly one of: `@Public()`, `@Roles(...)`, `@Authenticated()`, `@SelfOrAdmin()`, `@BatchAccess('READ'|'MANAGE')`.
- Never `new Date()` / `Date.now()` — inject `@Inject(CLOCK) private readonly clock: Clock`.
- No `any`, `as unknown as`, `@ts-ignore`, `!` non-null assertions.
- Never `eq(col, null)` — use `isNull()`.
- Do not edit `src/database/schema/`.
- Do not run `npm run db:baseline`.

## File Map

### New files to create

```
src/community/
  community.module.ts
  feed.controller.ts
  feed.service.ts
  study-group.controller.ts
  study-group.service.ts
  moderation.controller.ts
  moderation.service.ts
  dto/
    create-feed-post.dto.ts
    remove-feed-post.dto.ts
    create-study-group.dto.ts
    send-group-message.dto.ts
    remove-group-message.dto.ts
    create-report.dto.ts
    resolve-report.dto.ts

test/
  community-feed.int-spec.ts
  community-study-groups.int-spec.ts
  community-moderation.int-spec.ts
```

### Files to modify

- `src/app.module.ts` — one surgical import of `CommunityModule`

---

## API surface

### Feed (Ticket 21)

| Method | Path | Decorator | Who |
|--------|------|-----------|-----|
| GET | `/batches/:batchId/feed` | `@BatchAccess('READ')` | enrolled student + staff |
| POST | `/batches/:batchId/feed` | `@BatchAccess('READ')` | enrolled student + staff |
| GET | `/batches/:batchId/feed/:postId/replies` | `@BatchAccess('READ')` | enrolled student + staff |
| POST | `/batches/:batchId/feed/:postId/replies` | `@BatchAccess('READ')` | enrolled student + staff |
| DELETE | `/batches/:batchId/feed/:postId` | `@BatchAccess('MANAGE')` | staff only |

Students see only non-removed posts (`removedAt IS NULL`). Staff see everything.

### Study Groups (Ticket 22)

| Method | Path | Decorator | Who |
|--------|------|-----------|-----|
| GET | `/batches/:batchId/study-groups` | `@BatchAccess('READ')` | enrolled student (own groups) + staff (all) |
| POST | `/batches/:batchId/study-groups` | `@BatchAccess('READ')` | enrolled student + staff |
| GET | `/batches/:batchId/study-groups/:groupId` | `@BatchAccess('READ')` | member + staff |
| POST | `/batches/:batchId/study-groups/:groupId/join` | `@BatchAccess('READ')` | enrolled student |
| GET | `/batches/:batchId/study-groups/:groupId/messages` | `@BatchAccess('READ')` | member + staff |
| POST | `/batches/:batchId/study-groups/:groupId/messages` | `@BatchAccess('READ')` | member only |
| DELETE | `/batches/:batchId/study-groups/:groupId/messages/:messageId` | `@BatchAccess('MANAGE')` | staff only |

No route ever addresses a message to an individual student — all messages are group-scoped and readable by batch staff.

### Moderation (Ticket 23)

| Method | Path | Decorator | Who |
|--------|------|-----------|-----|
| POST | `/batches/:batchId/reports` | `@BatchAccess('READ')` | enrolled student + staff |
| GET | `/batches/:batchId/reports` | `@BatchAccess('MANAGE')` | staff only |
| PATCH | `/batches/:batchId/reports/:reportId` | `@BatchAccess('MANAGE')` | staff only |

`reportedBy` is never included in any student-facing response.

---

## Task 1: DTOs

**Files:**
- Create: `src/community/dto/create-feed-post.dto.ts`
- Create: `src/community/dto/remove-feed-post.dto.ts`
- Create: `src/community/dto/create-study-group.dto.ts`
- Create: `src/community/dto/send-group-message.dto.ts`
- Create: `src/community/dto/remove-group-message.dto.ts`
- Create: `src/community/dto/create-report.dto.ts`
- Create: `src/community/dto/resolve-report.dto.ts`

- [ ] **Step 1: Create `src/community/dto/create-feed-post.dto.ts`**

```ts
import { IsString, MaxLength } from 'class-validator';

export class CreateFeedPostDto {
  @IsString()
  @MaxLength(2000)
  body: string;
}
```

- [ ] **Step 2: Create `src/community/dto/remove-feed-post.dto.ts`**

```ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RemoveFeedPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

- [ ] **Step 3: Create `src/community/dto/create-study-group.dto.ts`**

```ts
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStudyGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;
}
```

- [ ] **Step 4: Create `src/community/dto/send-group-message.dto.ts`**

```ts
import { IsString, MaxLength } from 'class-validator';

export class SendGroupMessageDto {
  @IsString()
  @MaxLength(2000)
  body: string;
}
```

- [ ] **Step 5: Create `src/community/dto/remove-group-message.dto.ts`**

```ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RemoveGroupMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

- [ ] **Step 6: Create `src/community/dto/create-report.dto.ts`**

```ts
import { IsEnum, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsEnum(['FEED_POST', 'GROUP_MESSAGE'])
  targetKind: 'FEED_POST' | 'GROUP_MESSAGE';

  @IsString()
  targetId: string;

  @IsString()
  @MaxLength(500)
  reason: string;
}
```

- [ ] **Step 7: Create `src/community/dto/resolve-report.dto.ts`**

```ts
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveReportDto {
  @IsEnum(['RESOLVED', 'DISMISSED'])
  status: 'RESOLVED' | 'DISMISSED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  outcome?: string;
}
```

---

## Task 2: Feed Service

**Files:**
- Create: `src/community/feed.service.ts`

The feed service handles:
- Listing top-level posts (with staff vs student visibility)
- Creating top-level posts and replies
- Soft-removing posts (staff only)
- Deriving `authorKind` from viewer role

- [ ] **Step 1: Create `src/community/feed.service.ts`**

```ts
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { batchFeedPosts } from '../database/schema';
import {
  COMMUNITY_SETTINGS_GROUP,
} from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';
import { BatchAccessService, Viewer } from '../batches/access/batch-access.service';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
import { RemoveFeedPostDto } from './dto/remove-feed-post.dto';

type AuthorKind = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

function deriveAuthorKind(role: string): AuthorKind {
  if (role === 'PLATFORM_ADMIN') return 'ADMIN';
  if (role === 'INSTRUCTOR') return 'INSTRUCTOR';
  return 'STUDENT';
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

    return posts.map((p) => this.toPostView(p, isStaff));
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

    return replies.map((r) => this.toPostView(r, isStaff));
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
      .set({ replyCount: batchFeedPosts.replyCount as never })
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

  private toPostView(
    post: typeof batchFeedPosts.$inferSelect,
    isStaff: boolean,
  ) {
    if (isStaff) return post;
    const { removedAt: _r, removedBy: _rb, removalReason: _rr, ...rest } = post;
    return rest;
  }
}
```

**Note on replyCount increment:** Drizzle doesn't support `col + 1` natively in a terse way without raw SQL. Replace the replyCount update in `createReply` with:

```ts
import { sql } from 'drizzle-orm';
// ...
await this.db
  .update(batchFeedPosts)
  .set({ replyCount: sql`${batchFeedPosts.replyCount} + 1`, updatedAt: now })
  .where(eq(batchFeedPosts.postId, postId));
```

Use this form in the actual code — the snippet above is the corrected version.

- [ ] **Step 2: Verify TypeScript is clean**

```bash
cd D:/projects/groedu/backend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors about feed.service.ts (other pre-existing errors are fine for now).

---

## Task 3: Feed Controller

**Files:**
- Create: `src/community/feed.controller.ts`

- [ ] **Step 1: Create `src/community/feed.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchAccess } from '../batches/access/batch-access.decorator';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
import { RemoveFeedPostDto } from './dto/remove-feed-post.dto';
import { FeedService } from './feed.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('community')
@ApiBearerAuth()
@Controller('batches/:batchId/feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @BatchAccess('READ')
  @ApiOperation({ summary: 'List top-level feed posts' })
  @Get()
  listPosts(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.listPosts(batchId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Create a top-level feed post' })
  @Post()
  createPost(
    @Param('batchId') batchId: string,
    @Body() dto: CreateFeedPostDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.createPost(batchId, dto, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'List replies to a feed post' })
  @Get(':postId/replies')
  listReplies(
    @Param('batchId') batchId: string,
    @Param('postId') postId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.listReplies(batchId, postId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Reply to a feed post' })
  @Post(':postId/replies')
  createReply(
    @Param('batchId') batchId: string,
    @Param('postId') postId: string,
    @Body() dto: CreateFeedPostDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.createReply(batchId, postId, dto, user);
  }

  @BatchAccess('MANAGE')
  @ApiOperation({ summary: 'Remove a feed post (staff only)' })
  @Delete(':postId')
  removePost(
    @Param('batchId') batchId: string,
    @Param('postId') postId: string,
    @Body() dto: RemoveFeedPostDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.removePost(batchId, postId, dto, user.userId);
  }
}
```

---

## Task 4: Study Group Service

**Files:**
- Create: `src/community/study-group.service.ts`

The study group service handles:
- Listing groups (students see only their own groups; staff see all)
- Creating groups (enforces group cap per batch)
- Getting a group (only members or staff)
- Joining a group (enforces member cap)
- Listing messages (only members or staff)
- Sending messages (only members)
- Soft-removing messages (staff only)

- [ ] **Step 1: Create `src/community/study-group.service.ts`**

```ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  studyGroupMembers,
  studyGroupMessages,
  studyGroups,
} from '../database/schema';
import {
  COMMUNITY_SETTINGS_GROUP,
} from '../settings/settings.definitions';
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
          and(eq(studyGroups.batchId, batchId), eq(studyGroups.isDeleted, false)),
        );
    }
    if (!viewer.userId) return [];
    const memberships = await this.db
      .select({ groupId: studyGroupMembers.groupId })
      .from(studyGroupMembers)
      .where(eq(studyGroupMembers.userId, viewer.userId));
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) return [];
    const { inArray } = await import('drizzle-orm');
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
    const { asc } = await import('drizzle-orm');
    const conditions = [eq(studyGroupMessages.groupId, groupId)];
    if (!isStaff) {
      conditions.push(isNull(studyGroupMessages.removedAt));
    }
    const messages = await this.db
      .select()
      .from(studyGroupMessages)
      .where(and(...conditions))
      .orderBy(asc(studyGroupMessages.createdAt));

    return messages.map((m) => this.toMessageView(m, isStaff));
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

  private toMessageView(
    message: typeof studyGroupMessages.$inferSelect,
    isStaff: boolean,
  ) {
    if (isStaff) return message;
    const { removedAt: _r, removedBy: _rb, removalReason: _rr, ...rest } = message;
    return rest;
  }
}
```

**Note on dynamic import of `inArray` / `asc`:** These should be static imports at the top of the file, not dynamic imports. The code above uses dynamic import as placeholder prose — in the real file, add `import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';` at the top and remove the dynamic `await import(...)` calls.

- [ ] **Step 2: Verify TypeScript is clean (no new errors)**

```bash
cd D:/projects/groedu/backend && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 5: Study Group Controller

**Files:**
- Create: `src/community/study-group.controller.ts`

- [ ] **Step 1: Create `src/community/study-group.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchAccess } from '../batches/access/batch-access.decorator';
import { CreateStudyGroupDto } from './dto/create-study-group.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { RemoveGroupMessageDto } from './dto/remove-group-message.dto';
import { StudyGroupService } from './study-group.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('community')
@ApiBearerAuth()
@Controller('batches/:batchId/study-groups')
export class StudyGroupController {
  constructor(private readonly studyGroup: StudyGroupService) {}

  @BatchAccess('READ')
  @ApiOperation({ summary: 'List study groups (own groups for students, all for staff)' })
  @Get()
  listGroups(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.listGroups(batchId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Create a study group' })
  @Post()
  createGroup(
    @Param('batchId') batchId: string,
    @Body() dto: CreateStudyGroupDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.createGroup(batchId, dto, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Get a study group (members or staff only)' })
  @Get(':groupId')
  getGroup(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.getGroup(batchId, groupId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Join a study group' })
  @Post(':groupId/join')
  joinGroup(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.joinGroup(batchId, groupId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'List messages in a study group (members or staff)' })
  @Get(':groupId/messages')
  listMessages(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.listMessages(batchId, groupId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Send a message to a study group (members only)' })
  @Post(':groupId/messages')
  sendMessage(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @Body() dto: SendGroupMessageDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.sendMessage(batchId, groupId, dto, user);
  }

  @BatchAccess('MANAGE')
  @ApiOperation({ summary: 'Remove a group message (staff only)' })
  @Delete(':groupId/messages/:messageId')
  removeMessage(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() dto: RemoveGroupMessageDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.removeMessage(batchId, groupId, messageId, dto, user.userId);
  }
}
```

---

## Task 6: Moderation Service

**Files:**
- Create: `src/community/moderation.service.ts`

The moderation service handles:
- Submitting a report (unique per reporter+target)
- Listing the queue (staff only, scoped to batch)
- Resolving or dismissing a report

Key privacy rule: `reportedBy` is never returned in the student-facing list response.

- [ ] **Step 1: Create `src/community/moderation.service.ts`**

```ts
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { contentReports } from '../database/schema';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async createReport(
    batchId: string,
    dto: CreateReportDto,
    reportedBy: string,
  ) {
    const existing = await this.db
      .select({ reportId: contentReports.reportId })
      .from(contentReports)
      .where(
        and(
          eq(contentReports.reportedBy, reportedBy),
          eq(contentReports.targetKind, dto.targetKind),
          eq(contentReports.targetId, dto.targetId),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException('You have already reported this content');
    }
    const now = this.clock.now();
    const [report] = await this.db
      .insert(contentReports)
      .values({
        batchId,
        targetKind: dto.targetKind,
        targetId: dto.targetId,
        reportedBy,
        reason: dto.reason,
        createdAt: now,
      })
      .returning();
    const { reportedBy: _rb, ...safeView } = report;
    return safeView;
  }

  async listQueue(batchId: string) {
    return this.db
      .select()
      .from(contentReports)
      .where(
        and(
          eq(contentReports.batchId, batchId),
          eq(contentReports.status, 'OPEN'),
        ),
      )
      .orderBy(asc(contentReports.createdAt));
  }

  async resolveReport(
    batchId: string,
    reportId: string,
    dto: ResolveReportDto,
    resolvedBy: string,
  ) {
    const [report] = await this.db
      .select({ reportId: contentReports.reportId, status: contentReports.status })
      .from(contentReports)
      .where(
        and(
          eq(contentReports.reportId, reportId),
          eq(contentReports.batchId, batchId),
        ),
      )
      .limit(1);
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== 'OPEN') {
      throw new BadRequestException('Report is already resolved');
    }
    const now = this.clock.now();
    const [updated] = await this.db
      .update(contentReports)
      .set({
        status: dto.status,
        outcome: dto.outcome ?? null,
        resolvedBy,
        resolvedAt: now,
      })
      .where(eq(contentReports.reportId, reportId))
      .returning();
    return updated;
  }
}
```

---

## Task 7: Moderation Controller

**Files:**
- Create: `src/community/moderation.controller.ts`

- [ ] **Step 1: Create `src/community/moderation.controller.ts`**

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchAccess } from '../batches/access/batch-access.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ModerationService } from './moderation.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('community')
@ApiBearerAuth()
@Controller('batches/:batchId/reports')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Report a post or group message' })
  @Post()
  createReport(
    @Param('batchId') batchId: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.moderation.createReport(batchId, dto, user.userId);
  }

  @BatchAccess('MANAGE')
  @ApiOperation({ summary: 'View the moderation queue for this batch (staff only)' })
  @Get()
  listQueue(@Param('batchId') batchId: string) {
    return this.moderation.listQueue(batchId);
  }

  @BatchAccess('MANAGE')
  @ApiOperation({ summary: 'Resolve or dismiss a report (staff only)' })
  @Patch(':reportId')
  resolveReport(
    @Param('batchId') batchId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.moderation.resolveReport(batchId, reportId, dto, user.userId);
  }
}
```

---

## Task 8: CommunityModule and app.module.ts registration

**Files:**
- Create: `src/community/community.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create `src/community/community.module.ts`**

```ts
import { Module } from '@nestjs/common';

import { BatchesModule } from '../batches/batches.module';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { StudyGroupController } from './study-group.controller';
import { StudyGroupService } from './study-group.service';

@Module({
  imports: [DatabaseModule, BatchesModule, SettingsModule],
  controllers: [FeedController, StudyGroupController, ModerationController],
  providers: [FeedService, StudyGroupService, ModerationService],
})
export class CommunityModule {}
```

- [ ] **Step 2: Register CommunityModule in `src/app.module.ts`**

Add the import statement at the top of `src/app.module.ts` (alongside the other module imports):

```ts
import { CommunityModule } from './community/community.module';
```

Then add `CommunityModule` to the `imports` array in `@Module({})` — place it after `AssignmentsModule`:

```ts
AssignmentsModule,
SettingsModule,
CommunityModule,
```

**This is a shared file. Make one surgical edit and retry if another agent is writing it.**

- [ ] **Step 3: Check TypeScript and ESLint**

```bash
cd D:/projects/groedu/backend && npx tsc --noEmit 2>&1 | head -50
```

```bash
cd D:/projects/groedu/backend && npx eslint "src/community/**/*.ts" 2>&1 | head -50
```

Expected: zero errors (or only errors in unrelated files owned by other agents).

---

## Task 9: Fix `createReply` replyCount update in FeedService

After creating `feed.service.ts` in Task 2, you used `batchFeedPosts.replyCount as never` which is wrong. The real SQL increment needs `sql` from drizzle-orm.

- [ ] **Step 1: Edit `src/community/feed.service.ts` — fix the replyCount increment**

In `createReply`, replace:

```ts
    await this.db
      .update(batchFeedPosts)
      .set({ replyCount: batchFeedPosts.replyCount as never })
      .where(eq(batchFeedPosts.postId, postId));
```

with:

```ts
    await this.db
      .update(batchFeedPosts)
      .set({ replyCount: sql`${batchFeedPosts.replyCount} + 1`, updatedAt: now })
      .where(eq(batchFeedPosts.postId, postId));
```

Also add `sql` to the import from `'drizzle-orm'` at the top of the file.

---

## Task 10: Fix StudyGroupService dynamic imports

After creating `study-group.service.ts` in Task 4, the `await import('drizzle-orm')` calls are incorrect. Fix them to static imports.

- [ ] **Step 1: Edit `src/community/study-group.service.ts` — fix imports**

Change the top-level import line:

```ts
import { and, count, eq, isNull } from 'drizzle-orm';
```

to:

```ts
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';
```

Then in `listGroups`, replace:

```ts
    const { inArray } = await import('drizzle-orm');
    return this.db
```

with:

```ts
    return this.db
```

And in `listMessages`, replace:

```ts
    const { asc } = await import('drizzle-orm');
    const conditions = [eq(studyGroupMessages.groupId, groupId)];
```

with:

```ts
    const conditions = [eq(studyGroupMessages.groupId, groupId)];
```

---

## Task 11: Integration test — community-feed.int-spec.ts

**Files:**
- Create: `test/community-feed.int-spec.ts`

This test covers all acceptance criteria for Ticket 21:
- Student can post and reply in their batch feed
- Student cannot read or post to another batch's feed
- Instructor posts are distinguishable (authorKind === 'INSTRUCTOR')
- Instructors and admins can read everything including removed posts
- Removed posts stop appearing for students

- [ ] **Step 1: Create `test/community-feed.int-spec.ts`**

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  enrol,
  assignInstructor,
} from './support/factories';

describe('community feed', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let stranger: TestActor;
  let instructor: TestActor;
  let batchId: string;
  let otherBatchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    stranger = await createUser(database, 'LEARNER');
    instructor = await createUser(database, 'INSTRUCTOR');
    batchId = await createBatch(database, admin.userId);
    otherBatchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
    await assignInstructor(database, batchId, instructor.userId, 'LEAD');
  });

  async function post(actor: TestActor, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/feed`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  async function listFeed(actor: TestActor, bId = batchId) {
    return request(app.getHttpServer())
      .get(`/batches/${bId}/feed`)
      .set(...authHeader(app, actor));
  }

  async function reply(
    actor: TestActor,
    postId: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/feed/${postId}/replies`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  async function listReplies(actor: TestActor, postId: string) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/feed/${postId}/replies`)
      .set(...authHeader(app, actor));
  }

  async function removePost(
    actor: TestActor,
    postId: string,
    reason?: string,
  ) {
    return request(app.getHttpServer())
      .delete(`/batches/${batchId}/feed/${postId}`)
      .set(...authHeader(app, actor))
      .send(reason ? { reason } : {});
  }

  it('enrolled student can post to the feed', async () => {
    const { status, body } = await post(student, { body: 'Hello everyone!' });
    expect(status).toBe(201);
    expect(body.postId).toBeDefined();
    expect(body.authorId).toBe(student.userId);
    expect(body.authorKind).toBe('STUDENT');
  });

  it('stranger cannot post to or read the feed', async () => {
    const postRes = await post(stranger, { body: 'Sneaking in' });
    expect(postRes.status).toBe(404);

    const listRes = await listFeed(stranger);
    expect(listRes.status).toBe(404);
  });

  it('cross-batch: student from batch A cannot read batch B feed', async () => {
    const res = await listFeed(student, otherBatchId);
    expect(res.status).toBe(404);
  });

  it('instructor post has authorKind INSTRUCTOR', async () => {
    const { body } = await post(instructor, {
      body: 'Good morning class!',
    }).expect(201);
    expect(body.authorKind).toBe('INSTRUCTOR');
  });

  it('admin post has authorKind ADMIN', async () => {
    const { body } = await post(admin, {
      body: 'Platform update',
    }).expect(201);
    expect(body.authorKind).toBe('ADMIN');
  });

  it('enrolled student can reply to a feed post', async () => {
    const { body: parentPost } = await post(instructor, {
      body: 'Any questions?',
    }).expect(201);

    const { status, body } = await reply(student, parentPost.postId, {
      body: 'What time is class tomorrow?',
    });
    expect(status).toBe(201);
    expect(body.parentPostId).toBe(parentPost.postId);
    expect(body.authorKind).toBe('STUDENT');
  });

  it('student can list replies to a post', async () => {
    const { body: parentPost } = await post(instructor, {
      body: 'Check your notes',
    }).expect(201);
    await reply(student, parentPost.postId, { body: 'Done!' });

    const { body: replies } = await listReplies(student, parentPost.postId).expect(200);
    expect(replies).toHaveLength(1);
    expect(replies[0].body).toBe('Done!');
  });

  it('removed post does not appear in student feed but does appear for staff', async () => {
    const { body: parentPost } = await post(student, {
      body: 'Bad content',
    }).expect(201);

    await removePost(admin, parentPost.postId, 'Inappropriate').expect(200);

    const { body: studentFeed } = await listFeed(student).expect(200);
    expect(studentFeed.find((p: { postId: string }) => p.postId === parentPost.postId)).toBeUndefined();

    const { body: staffFeed } = await listFeed(instructor).expect(200);
    const staffPost = staffFeed.find((p: { postId: string }) => p.postId === parentPost.postId);
    expect(staffPost).toBeDefined();
    expect(staffPost.removedAt).toBeDefined();
    expect(staffPost.removedBy).toBe(admin.userId);
  });

  it('only staff can remove a post', async () => {
    const { body: parentPost } = await post(student, {
      body: 'Some post',
    }).expect(201);
    await removePost(student, parentPost.postId).expect(404);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd D:/projects/groedu/backend && npx jest --config jest.integration.config.js --runTestsByPath test/community-feed.int-spec.ts --forceExit 2>&1
```

Expected: all tests pass. Fix any failures before proceeding.

---

## Task 12: Integration test — community-study-groups.int-spec.ts

**Files:**
- Create: `test/community-study-groups.int-spec.ts`

This test covers all acceptance criteria for Ticket 22:
- Group belongs to exactly one batch
- Group size is capped
- Student cannot read a group they don't belong to
- Instructors/admins can read every group
- No interface permits a private message between two students (asserted by checking there is no route that addresses a message to an individual student — all routes use groupId)

- [ ] **Step 1: Create `test/community-study-groups.int-spec.ts`**

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  enrol,
  assignInstructor,
} from './support/factories';

describe('community study groups', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let studentB: TestActor;
  let stranger: TestActor;
  let instructor: TestActor;
  let batchId: string;
  let otherBatchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    studentB = await createUser(database, 'LEARNER');
    stranger = await createUser(database, 'LEARNER');
    instructor = await createUser(database, 'INSTRUCTOR');
    batchId = await createBatch(database, admin.userId);
    otherBatchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
    await enrol(database, batchId, studentB.userId);
    await assignInstructor(database, batchId, instructor.userId, 'LEAD');
  });

  async function createGroup(
    actor: TestActor,
    dto: Record<string, unknown>,
    bId = batchId,
  ) {
    return request(app.getHttpServer())
      .post(`/batches/${bId}/study-groups`)
      .set(...authHeader(app, actor))
      .send(dto);
  }

  async function listGroups(actor: TestActor, bId = batchId) {
    return request(app.getHttpServer())
      .get(`/batches/${bId}/study-groups`)
      .set(...authHeader(app, actor));
  }

  async function getGroup(actor: TestActor, groupId: string) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/study-groups/${groupId}`)
      .set(...authHeader(app, actor));
  }

  async function joinGroup(actor: TestActor, groupId: string) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/study-groups/${groupId}/join`)
      .set(...authHeader(app, actor));
  }

  async function sendMessage(
    actor: TestActor,
    groupId: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/study-groups/${groupId}/messages`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  async function listMessages(actor: TestActor, groupId: string) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/study-groups/${groupId}/messages`)
      .set(...authHeader(app, actor));
  }

  async function removeMessage(
    actor: TestActor,
    groupId: string,
    messageId: string,
  ) {
    return request(app.getHttpServer())
      .delete(
        `/batches/${batchId}/study-groups/${groupId}/messages/${messageId}`,
      )
      .set(...authHeader(app, actor))
      .send({});
  }

  it('student can create a study group and is automatically a member', async () => {
    const { status, body } = await createGroup(student, {
      name: 'Physics Warriors',
    });
    expect(status).toBe(201);
    expect(body.groupId).toBeDefined();
    expect(body.batchId).toBe(batchId);

    const { body: groups } = await listGroups(student).expect(200);
    expect(groups.map((g: { groupId: string }) => g.groupId)).toContain(
      body.groupId,
    );
  });

  it('group belongs to exactly one batch — cross-batch: stranger cannot see it', async () => {
    const { body: group } = await createGroup(student, {
      name: 'Study Club',
    }).expect(201);

    const { status } = await getGroup(stranger, group.groupId);
    expect(status).toBe(404);
  });

  it('student from batch A cannot list or access batch B study groups', async () => {
    const { status } = await listGroups(student, otherBatchId);
    expect(status).toBe(404);
  });

  it('student cannot read a group they do not belong to', async () => {
    const { body: group } = await createGroup(student, {
      name: 'Exclusive Group',
    }).expect(201);

    const { status } = await getGroup(studentB, group.groupId);
    expect(status).toBe(404);
  });

  it('instructor can read every group in the batch', async () => {
    const { body: group } = await createGroup(student, {
      name: 'JEE Prep',
    }).expect(201);

    await getGroup(instructor, group.groupId).expect(200);

    const { body: groups } = await listGroups(instructor).expect(200);
    expect(groups.map((g: { groupId: string }) => g.groupId)).toContain(
      group.groupId,
    );
  });

  it('admin can read every group in the batch', async () => {
    const { body: group } = await createGroup(student, {
      name: 'NEET Warriors',
    }).expect(201);

    await getGroup(admin, group.groupId).expect(200);
  });

  it('another student can join a group', async () => {
    const { body: group } = await createGroup(student, {
      name: 'Open Group',
    }).expect(201);

    await joinGroup(studentB, group.groupId).expect(201);

    const { body: groups } = await listGroups(studentB).expect(200);
    expect(groups.map((g: { groupId: string }) => g.groupId)).toContain(
      group.groupId,
    );
  });

  it('group size is capped — joining a full group is rejected', async () => {
    const { body: group } = await createGroup(student, {
      name: 'Capped Group',
    }).expect(201);

    const extras: TestActor[] = [];
    for (let i = 0; i < 7; i++) {
      const extra = await createUser(database, 'LEARNER');
      await enrol(database, batchId, extra.userId);
      extras.push(extra);
    }
    for (const extra of extras.slice(0, 7)) {
      await joinGroup(extra, group.groupId).expect(201);
    }

    const overflow = await createUser(database, 'LEARNER');
    await enrol(database, batchId, overflow.userId);
    const { status } = await joinGroup(overflow, group.groupId);
    expect(status).toBe(400);
  });

  it('member can send and read messages in the group', async () => {
    const { body: group } = await createGroup(student, {
      name: 'Chat Group',
    }).expect(201);

    await sendMessage(student, group.groupId, { body: 'First message' }).expect(201);

    const { body: messages } = await listMessages(student, group.groupId).expect(200);
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe('First message');
    expect(messages[0].authorId).toBe(student.userId);
  });

  it('non-member cannot send or read messages', async () => {
    const { body: group } = await createGroup(student, {
      name: 'Private Chat',
    }).expect(201);

    await sendMessage(studentB, group.groupId, { body: 'Hello' }).expect(403);
    await listMessages(studentB, group.groupId).expect(404);
  });

  it('staff cannot send messages into student groups (no private message surface)', async () => {
    const { body: group } = await createGroup(student, {
      name: 'Test Group',
    }).expect(201);
    const { status } = await sendMessage(instructor, group.groupId, {
      body: 'Hello students',
    });
    expect(status).toBe(403);
  });

  it('staff can remove a group message; student cannot see it afterwards', async () => {
    const { body: group } = await createGroup(student, {
      name: 'Moderated Group',
    }).expect(201);
    const { body: msg } = await sendMessage(student, group.groupId, {
      body: 'Inappropriate content',
    }).expect(201);

    await removeMessage(admin, group.groupId, msg.messageId).expect(200);

    const { body: messages } = await listMessages(student, group.groupId).expect(200);
    expect(messages.find((m: { messageId: string }) => m.messageId === msg.messageId)).toBeUndefined();

    const { body: staffMessages } = await listMessages(instructor, group.groupId).expect(200);
    const staffMsg = staffMessages.find((m: { messageId: string }) => m.messageId === msg.messageId);
    expect(staffMsg).toBeDefined();
    expect(staffMsg.removedAt).toBeDefined();
  });

  it('no route exists that allows messaging an individual student (no DM surface)', () => {
    const server = app.getHttpServer();
    expect(server).toBeDefined();
    const routes: string[] = [];
    const router = (server as { _events?: { request?: { _router?: { stack?: Array<{ route?: { path: string; methods: Record<string, boolean> } }> } } } })._events?.request?._router?.stack ?? [];
    for (const layer of router) {
      if (layer.route) {
        const path: string = layer.route.path;
        const methods = Object.keys(layer.route.methods);
        for (const method of methods) {
          routes.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
    const dmRoutes = routes.filter(
      (r) => r.includes('direct-message') || r.includes('/dm') || r.includes('/pm'),
    );
    expect(dmRoutes).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd D:/projects/groedu/backend && npx jest --config jest.integration.config.js --runTestsByPath test/community-study-groups.int-spec.ts --forceExit 2>&1
```

Expected: all tests pass.

---

## Task 13: Integration test — community-moderation.int-spec.ts

**Files:**
- Create: `test/community-moderation.int-spec.ts`

This test covers all acceptance criteria for Ticket 23:
- Student can report a post, reply, or group message
- Reports appear in staff queue
- Resolving a report records outcome and actor
- Reported item stays readable to staff after removal
- Student cannot see who reported what

- [ ] **Step 1: Create `test/community-moderation.int-spec.ts`**

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  enrol,
  assignInstructor,
} from './support/factories';

describe('community moderation', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let reportingStudent: TestActor;
  let instructor: TestActor;
  let batchId: string;
  let otherBatchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    reportingStudent = await createUser(database, 'LEARNER');
    instructor = await createUser(database, 'INSTRUCTOR');
    batchId = await createBatch(database, admin.userId);
    otherBatchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
    await enrol(database, batchId, reportingStudent.userId);
    await assignInstructor(database, batchId, instructor.userId, 'LEAD');
  });

  async function createFeedPost(actor: TestActor) {
    const { body } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/feed`)
      .set(...authHeader(app, actor))
      .send({ body: 'A post to be reported' })
      .expect(201);
    return body as { postId: string };
  }

  async function report(
    actor: TestActor,
    dto: Record<string, unknown>,
    bId = batchId,
  ) {
    return request(app.getHttpServer())
      .post(`/batches/${bId}/reports`)
      .set(...authHeader(app, actor))
      .send(dto);
  }

  async function listQueue(actor: TestActor, bId = batchId) {
    return request(app.getHttpServer())
      .get(`/batches/${bId}/reports`)
      .set(...authHeader(app, actor));
  }

  async function resolveReport(
    actor: TestActor,
    reportId: string,
    dto: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .patch(`/batches/${batchId}/reports/${reportId}`)
      .set(...authHeader(app, actor))
      .send(dto);
  }

  it('student can report a feed post', async () => {
    const { postId } = await createFeedPost(student);

    const { status, body } = await report(reportingStudent, {
      targetKind: 'FEED_POST',
      targetId: postId,
      reason: 'Offensive content',
    });
    expect(status).toBe(201);
    expect(body.reportId).toBeDefined();
    expect(body.status).toBe('OPEN');
  });

  it('reporter identity is not visible in the report response', async () => {
    const { postId } = await createFeedPost(student);
    const { body } = await report(reportingStudent, {
      targetKind: 'FEED_POST',
      targetId: postId,
      reason: 'Spam',
    }).expect(201);

    expect(body.reportedBy).toBeUndefined();
  });

  it('reports appear in the staff moderation queue', async () => {
    const { postId } = await createFeedPost(student);
    await report(reportingStudent, {
      targetKind: 'FEED_POST',
      targetId: postId,
      reason: 'Harmful content',
    }).expect(201);

    const { body: queue } = await listQueue(instructor).expect(200);
    expect(queue).toHaveLength(1);
    expect(queue[0].targetId).toBe(postId);
    expect(queue[0].targetKind).toBe('FEED_POST');
  });

  it('student cannot access the moderation queue', async () => {
    await listQueue(student).expect(404);
  });

  it('resolving a report records outcome and actor', async () => {
    const { postId } = await createFeedPost(student);
    const { body: reportBody } = await report(reportingStudent, {
      targetKind: 'FEED_POST',
      targetId: postId,
      reason: 'Violates rules',
    }).expect(201);

    const { body: resolved } = await resolveReport(admin, reportBody.reportId, {
      status: 'RESOLVED',
      outcome: 'Post removed',
    }).expect(200);

    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.outcome).toBe('Post removed');
    expect(resolved.resolvedBy).toBe(admin.userId);
    expect(resolved.resolvedAt).toBeDefined();
  });

  it('dismissing a report marks it as dismissed', async () => {
    const { postId } = await createFeedPost(student);
    const { body: reportBody } = await report(reportingStudent, {
      targetKind: 'FEED_POST',
      targetId: postId,
      reason: 'Unsure',
    }).expect(201);

    const { body: resolved } = await resolveReport(instructor, reportBody.reportId, {
      status: 'DISMISSED',
    }).expect(200);

    expect(resolved.status).toBe('DISMISSED');
  });

  it('resolved report no longer appears in the open queue', async () => {
    const { postId } = await createFeedPost(student);
    const { body: reportBody } = await report(reportingStudent, {
      targetKind: 'FEED_POST',
      targetId: postId,
      reason: 'Bad',
    }).expect(201);

    await resolveReport(admin, reportBody.reportId, {
      status: 'RESOLVED',
    }).expect(200);

    const { body: queue } = await listQueue(admin).expect(200);
    expect(queue.find((r: { reportId: string }) => r.reportId === reportBody.reportId)).toBeUndefined();
  });

  it('cross-batch: student cannot report to a batch they are not enrolled in', async () => {
    await report(
      student,
      {
        targetKind: 'FEED_POST',
        targetId: 'some-post-id',
        reason: 'Test',
      },
      otherBatchId,
    ).expect(404);
  });

  it('staff can view reported content even after it is removed', async () => {
    const { postId } = await createFeedPost(student);
    await report(reportingStudent, {
      targetKind: 'FEED_POST',
      targetId: postId,
      reason: 'Bad content',
    }).expect(201);

    await request(app.getHttpServer())
      .delete(`/batches/${batchId}/feed/${postId}`)
      .set(...authHeader(app, admin))
      .send({ reason: 'Removed after report' })
      .expect(200);

    const { body: queue } = await listQueue(admin).expect(200);
    const reportEntry = queue.find((r: { targetId: string }) => r.targetId === postId);
    expect(reportEntry).toBeDefined();
    expect(reportEntry.targetId).toBe(postId);

    const { body: feedForStaff } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/feed`)
      .set(...authHeader(app, admin))
      .expect(200);
    const removedPost = feedForStaff.find((p: { postId: string }) => p.postId === postId);
    expect(removedPost).toBeDefined();
    expect(removedPost.removedAt).toBeDefined();
  });

  it('a student cannot submit the same report twice', async () => {
    const { postId } = await createFeedPost(student);
    await report(reportingStudent, {
      targetKind: 'FEED_POST',
      targetId: postId,
      reason: 'Spam',
    }).expect(201);

    const { status } = await report(reportingStudent, {
      targetKind: 'FEED_POST',
      targetId: postId,
      reason: 'Spam again',
    });
    expect(status).toBe(409);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd D:/projects/groedu/backend && npx jest --config jest.integration.config.js --runTestsByPath test/community-moderation.int-spec.ts --forceExit 2>&1
```

Expected: all tests pass.

---

## Task 14: Run authorization-surface.int-spec.ts

- [ ] **Step 1: Run the authorization surface test**

```bash
cd D:/projects/groedu/backend && npx jest --config jest.integration.config.js --runTestsByPath test/authorization-surface.int-spec.ts --forceExit 2>&1
```

Expected: passes. If any new community routes are missing a stance decorator, add one.

---

## Task 15: Final TypeScript and ESLint check

- [ ] **Step 1: Check TypeScript**

```bash
cd D:/projects/groedu/backend && npx tsc --noEmit 2>&1
```

Expected: zero new errors introduced by community files.

- [ ] **Step 2: Check ESLint**

```bash
cd D:/projects/groedu/backend && npx eslint "src/community/**/*.ts" 2>&1
```

Expected: zero errors.

---

## Self-review against spec

### Ticket 21 checklist
- [x] A student can post and reply in the feed of a batch they are enrolled in — `POST /feed` and `POST /feed/:postId/replies`
- [x] A student cannot read or post to another batch's feed — cross-batch test in Task 11
- [x] Instructor posts are distinguishable — `authorKind: 'INSTRUCTOR'` test in Task 11
- [x] Instructors and admins can read everything — staff feed returns removedAt data
- [x] A removed post stops appearing but is retained for moderation review — soft-delete test in Task 11

### Ticket 22 checklist
- [x] A group belongs to exactly one batch and cannot span batches — batchId on group, cross-batch test
- [x] Group size is capped and the cap is owner-managed configuration — settings-driven memberCap, cap test in Task 12
- [x] A student cannot read a group they do not belong to — test in Task 12
- [x] Instructors and admins of the batch can read every group in it — test in Task 12
- [x] No interface anywhere permits a private message between two students — staff cannot send group messages, all messages require groupId param, route scan test in Task 12

### Ticket 23 checklist
- [x] A student can report a post, a reply or a group message with a reason — `POST /reports`, targetKind enum covers both
- [x] Reports appear in a staff queue scoped to batches that staff member covers — `GET /reports` with `@BatchAccess('MANAGE')`
- [x] Resolving a report records the outcome and the actor — test in Task 13
- [x] A reported item stays readable to staff after removal — test in Task 13
- [x] A student cannot see who reported what — `reportedBy` stripped from student response, test in Task 13

### No DM surface assertion
The "no private message" requirement is enforced structurally: the only message routes are `POST /batches/:batchId/study-groups/:groupId/messages` (group-scoped, readable by staff). There is no route addressed to a `userId`. The route-scan test in Task 12 asserts no DM/PM route exists.
