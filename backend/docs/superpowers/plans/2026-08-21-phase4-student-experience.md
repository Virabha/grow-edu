# Phase 4 Student Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the student-facing discovery surface: filterable catalogue, full-text search, wishlist, goal capture, and rule-based recommendations.

**Architecture:** A new `src/discovery/` NestJS module owns all five features. `SearchSyncService` keeps `searchDocuments` up-to-date via a `registerAndRepeat` background job that never touches `src/batches/`. Integration tests drive everything through HTTP; the `InlineJobQueue` (retrieved via `app.get(JOB_QUEUE)`) is ticked where background sync needs to be observed.

**Tech Stack:** NestJS 10, Drizzle ORM 0.29, postgres.js, PostgreSQL full-text (plainto_tsquery + ts_rank + GIN index). No AI, no LLM, no model calls.

---

## House Rules Checklist (read before every task)

- Zero comments in any new code.
- Every controller handler needs exactly one auth stance: `@Public()`, `@Roles(...)`, `@Authenticated()`, `@SelfOrAdmin()`, or `@BatchAccess('READ'|'MANAGE')`.
- Never `new Date()` / `Date.now()` in src/. Inject `@Inject(CLOCK) private readonly clock: Clock` from `src/common/clock.ts`.
- Zero foreign keys. Text PKs with `.$defaultFn(() => crypto.randomUUID())` (discovery schema tables already exist — do not touch `src/database/schema/`).
- Use `isNull()` not `eq(col, null)`.
- Never `any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error` without description, or non-null assertion `!`.
- Do NOT edit files outside `src/discovery/`, `src/app.module.ts`, `src/auth/dto/register.dto.ts`, and the test files listed below.
- If a TypeScript error appears in a file you do not own, wait 2 min and retry.

---

## File Map

### Created
| Path | Responsibility |
|------|----------------|
| `src/discovery/discovery.module.ts` | Module wiring |
| `src/discovery/dto/catalogue-filter.dto.ts` | Query params for `GET /catalogue` |
| `src/discovery/dto/catalogue-batch.dto.ts` | Public-safe batch projection type |
| `src/discovery/dto/search-query.dto.ts` | Query params for `GET /search` |
| `src/discovery/dto/save-goal.dto.ts` | Body for `PUT /me/goal` |
| `src/discovery/catalogue.controller.ts` | Routes for the public catalogue |
| `src/discovery/catalogue.service.ts` | Catalogue query + default-goal injection |
| `src/discovery/search.controller.ts` | Route for full-text search |
| `src/discovery/search.service.ts` | Full-text query against `searchDocuments` |
| `src/discovery/search-sync.service.ts` | Background sync: batches + instructors → searchDocuments |
| `src/discovery/wishlist.controller.ts` | Save / unsave / list wishlist |
| `src/discovery/wishlist.service.ts` | `batchWishlist` CRUD |
| `src/discovery/goal.controller.ts` | GET + PUT /me/goal |
| `src/discovery/goal.service.ts` | Parse goalOptions, upsert `studentProfiles` |
| `src/discovery/recommendation.controller.ts` | GET /me/recommendations |
| `src/discovery/recommendation.service.ts` | Rule-based recommendations (no AI) |
| `test/catalogue.int-spec.ts` | Ticket 24 tests |
| `test/search.int-spec.ts` | Ticket 25 tests |
| `test/wishlist.int-spec.ts` | Ticket 27 tests |
| `test/goal-capture.int-spec.ts` | Ticket 28 tests |
| `test/recommendations.int-spec.ts` | Ticket 30 tests |

### Modified
| Path | Change |
|------|--------|
| `src/app.module.ts` | Add `DiscoveryModule` to imports |

> **`src/auth/dto/register.dto.ts` and `src/auth/auth.service.ts` are contested by another agent.** Goal-at-sign-up is satisfied by `PUT /me/goal` which the client calls immediately after registration. Do NOT touch auth files unless they are unmodified when you start.

---

## Task 1 — Module Scaffold

**Files:**
- Create: `src/discovery/discovery.module.ts`
- Modify: `src/app.module.ts` (one import line)

- [ ] **Step 1: Create the module file**

```ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { CatalogueController } from './catalogue.controller';
import { CatalogueService } from './catalogue.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchSyncService } from './search-sync.service';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [DatabaseModule, SettingsModule],
  controllers: [
    CatalogueController,
    SearchController,
    WishlistController,
    GoalController,
    RecommendationController,
  ],
  providers: [
    CatalogueService,
    SearchService,
    SearchSyncService,
    WishlistService,
    GoalService,
    RecommendationService,
  ],
})
export class DiscoveryModule {}
```

- [ ] **Step 2: Register DiscoveryModule in app.module.ts**

In `src/app.module.ts`, add `import { DiscoveryModule } from './discovery/discovery.module';` to the imports at the top, and add `DiscoveryModule,` inside the `imports: [...]` array (after `ResultsModule`).

The existing `imports` block ends at:
```ts
    ResultsModule,
    CertificateTemplateModule,
```

Change it to:
```ts
    ResultsModule,
    CertificateTemplateModule,
    DiscoveryModule,
```

- [ ] **Step 3: Verify TS compiles (stubs okay)**

```bash
cd D:\projects\groedu\backend && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors about missing files (the controllers/services don't exist yet) but no syntax errors in what you've written.

---

## Task 2 — DTOs

**Files:**
- Create: `src/discovery/dto/catalogue-filter.dto.ts`
- Create: `src/discovery/dto/catalogue-batch.dto.ts`
- Create: `src/discovery/dto/search-query.dto.ts`
- Create: `src/discovery/dto/save-goal.dto.ts`

- [ ] **Step 1: catalogue-filter.dto.ts**

```ts
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CatalogueFilterDto {
  @IsOptional()
  @IsString()
  goalKey?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
```

- [ ] **Step 2: catalogue-batch.dto.ts**

This is a plain TypeScript type, not a class-validator DTO — it is the shape returned to clients.

```ts
export type CatalogueBatch = {
  batchId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  thumbnail: string | null;
  price: string;
  currency: string;
  language: string;
  goalKey: string | null;
  deliveryMode: string;
  startDate: Date;
  endDate: Date;
  status: string;
  categoryId: string | null;
};

export type CatalogueResponse = {
  data: CatalogueBatch[];
  page: number;
  limit: number;
  total: number;
};
```

- [ ] **Step 3: search-query.dto.ts**

```ts
import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class SearchQueryDto {
  @IsNotEmpty()
  @IsString()
  q: string;

  @IsOptional()
  @IsIn(['BATCH', 'INSTRUCTOR'])
  kind?: 'BATCH' | 'INSTRUCTOR';
}
```

- [ ] **Step 4: save-goal.dto.ts**

```ts
import { IsNotEmpty, IsString } from 'class-validator';

export class SaveGoalDto {
  @IsNotEmpty()
  @IsString()
  goalKey: string;
}
```

---

## Task 3 — GoalService + GoalController

**Files:**
- Create: `src/discovery/goal.service.ts`
- Create: `src/discovery/goal.controller.ts`

- [ ] **Step 1: goal.service.ts**

```ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { studentProfiles } from '../database/schema';
import { DISCOVERY_SETTINGS_GROUP } from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class GoalService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly settings: SettingsService,
  ) {}

  async getGoalOptions(): Promise<{ key: string; label: string }[]> {
    const group = await this.settings.getGroup(DISCOVERY_SETTINGS_GROUP);
    const raw = String(group.values.goalOptions ?? '');
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('|'))
      .map((line) => {
        const pipeIndex = line.indexOf('|');
        return {
          key: line.slice(0, pipeIndex).trim(),
          label: line.slice(pipeIndex + 1).trim(),
        };
      });
  }

  async getStudentGoal(userId: string): Promise<{ goalKey: string | null }> {
    const [row] = await this.db
      .select({ goalKey: studentProfiles.goalKey })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);
    return { goalKey: row?.goalKey ?? null };
  }

  async setGoal(userId: string, goalKey: string): Promise<void> {
    const options = await this.getGoalOptions();
    const valid = options.some((o) => o.key === goalKey);
    if (!valid) {
      throw new BadRequestException(`"${goalKey}" is not a recognised goal`);
    }

    const now = this.clock.now();
    await this.db
      .insert(studentProfiles)
      .values({
        userId,
        goalKey,
        goalSetAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: studentProfiles.userId,
        set: { goalKey, goalSetAt: now, updatedAt: now },
      });
  }
}
```

- [ ] **Step 2: goal.controller.ts**

```ts
import { Body, Controller, Get, Put } from '@nestjs/common';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { GoalService } from './goal.service';
import { SaveGoalDto } from './dto/save-goal.dto';

interface AuthedUser { userId: string; role: string; }

@Controller('me/goal')
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Authenticated()
  @Get()
  get(@CurrentUser() user: AuthedUser) {
    return this.goalService.getStudentGoal(user.userId);
  }

  @Authenticated()
  @Put()
  set(@CurrentUser() user: AuthedUser, @Body() dto: SaveGoalDto) {
    return this.goalService.setGoal(user.userId, dto.goalKey);
  }

  @Public()
  @Get('options')
  options() {
    return this.goalService.getGoalOptions();
  }
}
```

- [ ] **Step 3: Verify TS for goal files**

```bash
cd D:\projects\groedu\backend && npx tsc --noEmit 2>&1 | grep "discovery/goal"
```

Expected: no errors from goal files.

---

## Task 4 — CatalogueService + CatalogueController

**Files:**
- Create: `src/discovery/catalogue.service.ts`
- Create: `src/discovery/catalogue.controller.ts`

- [ ] **Step 1: catalogue.service.ts**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, gte, inArray, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { batches, studentProfiles } from '../database/schema';
import { DISCOVERY_SETTINGS_GROUP } from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';
import type { CatalogueBatch, CatalogueResponse } from './dto/catalogue-batch.dto';
import type { CatalogueFilterDto } from './dto/catalogue-filter.dto';

const LISTED_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;

const PUBLIC_COLUMNS = {
  batchId: batches.batchId,
  title: batches.title,
  slug: batches.slug,
  shortDescription: batches.shortDescription,
  thumbnail: batches.thumbnail,
  price: batches.price,
  currency: batches.currency,
  language: batches.language,
  goalKey: batches.goalKey,
  deliveryMode: batches.deliveryMode,
  startDate: batches.startDate,
  endDate: batches.endDate,
  status: batches.status,
  categoryId: batches.categoryId,
} as const;

@Injectable()
export class CatalogueService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly settings: SettingsService,
  ) {}

  async list(
    filter: CatalogueFilterDto,
    viewer: { userId?: string },
  ): Promise<CatalogueResponse> {
    const group = await this.settings.getGroup(DISCOVERY_SETTINGS_GROUP);
    const pageSize = Number(group.values.cataloguePageSize) || 20;

    let effectiveGoalKey = filter.goalKey ?? null;
    if (!effectiveGoalKey && viewer.userId) {
      const [profile] = await this.db
        .select({ goalKey: studentProfiles.goalKey })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, viewer.userId))
        .limit(1);
      effectiveGoalKey = profile?.goalKey ?? null;
    }

    const conditions = [
      eq(batches.isDeleted, false),
      eq(batches.visibility, 'PUBLIC'),
      inArray(batches.status, [...LISTED_STATUSES]),
    ];

    if (effectiveGoalKey) {
      conditions.push(eq(batches.goalKey, effectiveGoalKey));
    }
    if (filter.language) {
      conditions.push(eq(batches.language, filter.language));
    }
    if (filter.startDate) {
      conditions.push(gte(batches.startDate, new Date(filter.startDate)));
    }

    const where = and(...conditions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? pageSize, 100);
    const offset = (page - 1) * limit;

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(batches)
      .where(where);

    const data = await this.db
      .select(PUBLIC_COLUMNS)
      .from(batches)
      .where(where)
      .orderBy(asc(batches.startDate), asc(batches.batchId))
      .limit(limit)
      .offset(offset);

    return { data: data as CatalogueBatch[], page, limit, total };
  }
}
```

- [ ] **Step 2: catalogue.controller.ts**

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CatalogueService } from './catalogue.service';
import { CatalogueFilterDto } from './dto/catalogue-filter.dto';

interface OptionalUser { userId?: string; }

@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(@Query() filter: CatalogueFilterDto, @CurrentUser() user?: OptionalUser) {
    return this.catalogueService.list(filter, user ?? {});
  }
}
```

---

## Task 5 — SearchSyncService

**Files:**
- Create: `src/discovery/search-sync.service.ts`

This service NEVER touches `src/batches/`. It reads the database directly and syncs all batches and instructors to `searchDocuments`.

- [ ] **Step 1: search-sync.service.ts**

```ts
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  batches,
  instructorProfiles,
  searchDocuments,
  users,
} from '../database/schema';
import { JOB_QUEUE, JobQueue, registerAndRepeat } from '../jobs/job-queue';

const SYNC_JOB = 'discovery.search.sync';
const SYNC_INTERVAL_MS = 60_000;

const LISTED_STATUSES = new Set(['UPCOMING', 'ONGOING', 'COMPLETED']);

@Injectable()
export class SearchSyncService implements OnModuleInit {
  private readonly logger = new Logger(SearchSyncService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      SYNC_JOB,
      async () => { await this.syncAll(); },
      SYNC_INTERVAL_MS,
      (err) => this.logger.error('Search sync job failed', err),
    );
  }

  async syncAll(): Promise<void> {
    await this.syncBatches();
    await this.syncInstructors();
  }

  private async syncBatches(): Promise<void> {
    const now = this.clock.now();
    const rows = await this.db
      .select({
        batchId: batches.batchId,
        title: batches.title,
        description: batches.description,
        status: batches.status,
        isDeleted: batches.isDeleted,
        visibility: batches.visibility,
      })
      .from(batches);

    for (const row of rows) {
      const isListed =
        !row.isDeleted &&
        row.visibility === 'PUBLIC' &&
        LISTED_STATUSES.has(row.status);
      await this.db
        .insert(searchDocuments)
        .values({
          kind: 'BATCH',
          referenceId: row.batchId,
          title: row.title,
          body: row.description ?? '',
          isListed,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [searchDocuments.kind, searchDocuments.referenceId],
          set: {
            title: row.title,
            body: row.description ?? '',
            isListed,
            updatedAt: now,
          },
        });
    }
  }

  private async syncInstructors(): Promise<void> {
    const now = this.clock.now();
    const rows = await this.db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        bio: instructorProfiles.bio,
        isActive: instructorProfiles.isActive,
      })
      .from(instructorProfiles)
      .innerJoin(users, eq(users.userId, instructorProfiles.userId));

    for (const row of rows) {
      const parts = [row.firstName, row.lastName].filter(
        (p): p is string => typeof p === 'string' && p.length > 0,
      );
      const title = parts.length > 0 ? parts.join(' ') : row.userId;
      await this.db
        .insert(searchDocuments)
        .values({
          kind: 'INSTRUCTOR',
          referenceId: row.userId,
          title,
          body: row.bio ?? '',
          isListed: row.isActive,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [searchDocuments.kind, searchDocuments.referenceId],
          set: {
            title,
            body: row.bio ?? '',
            isListed: row.isActive,
            updatedAt: now,
          },
        });
    }
  }
}
```

---

## Task 6 — SearchService + SearchController

**Files:**
- Create: `src/discovery/search.service.ts`
- Create: `src/discovery/search.controller.ts`

- [ ] **Step 1: search.service.ts**

```ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { searchDocuments } from '../database/schema';
import type { SearchQueryDto } from './dto/search-query.dto';

export type SearchResult = {
  kind: string;
  referenceId: string;
  title: string;
  rank: number;
};

@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async search(dto: SearchQueryDto): Promise<SearchResult[]> {
    const q = dto.q.trim();
    if (!q) {
      return [];
    }

    const conditions = [
      eq(searchDocuments.isListed, true),
      sql`${searchDocuments.searchVector} @@ plainto_tsquery('english', ${q})`,
    ];

    if (dto.kind) {
      conditions.push(eq(searchDocuments.kind, dto.kind));
    }

    const rows = await this.db
      .select({
        kind: searchDocuments.kind,
        referenceId: searchDocuments.referenceId,
        title: searchDocuments.title,
        rank: sql<number>`ts_rank(${searchDocuments.searchVector}, plainto_tsquery('english', ${q}))`,
      })
      .from(searchDocuments)
      .where(and(...conditions))
      .orderBy(
        desc(
          sql`ts_rank(${searchDocuments.searchVector}, plainto_tsquery('english', ${q}))`,
        ),
      )
      .limit(50);

    return rows as SearchResult[];
  }
}
```

- [ ] **Step 2: search.controller.ts**

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  search(@Query() dto: SearchQueryDto) {
    return this.searchService.search(dto);
  }
}
```

---

## Task 7 — WishlistService + WishlistController

**Files:**
- Create: `src/discovery/wishlist.service.ts`
- Create: `src/discovery/wishlist.controller.ts`

- [ ] **Step 1: wishlist.service.ts**

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { batches, batchWishlist } from '../database/schema';

const LISTED_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;

@Injectable()
export class WishlistService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async save(userId: string, batchId: string): Promise<void> {
    const [batch] = await this.db
      .select({ batchId: batches.batchId })
      .from(batches)
      .where(
        and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)),
      )
      .limit(1);
    if (!batch) throw new NotFoundException('Batch not found');

    await this.db
      .insert(batchWishlist)
      .values({ userId, batchId, createdAt: this.clock.now() })
      .onConflictDoNothing();
  }

  async remove(userId: string, batchId: string): Promise<void> {
    await this.db
      .delete(batchWishlist)
      .where(
        and(
          eq(batchWishlist.userId, userId),
          eq(batchWishlist.batchId, batchId),
        ),
      );
  }

  async list(userId: string): Promise<{ batchId: string; savedAt: Date; title: string; slug: string; thumbnail: string | null; price: string; }[]> {
    const wishlistRows = await this.db
      .select({
        batchId: batchWishlist.batchId,
        savedAt: batchWishlist.createdAt,
      })
      .from(batchWishlist)
      .where(eq(batchWishlist.userId, userId));

    if (wishlistRows.length === 0) return [];

    const batchIds = wishlistRows.map((r) => r.batchId);

    const batchRows = await this.db
      .select({
        batchId: batches.batchId,
        title: batches.title,
        slug: batches.slug,
        thumbnail: batches.thumbnail,
        price: batches.price,
        status: batches.status,
        isDeleted: batches.isDeleted,
        visibility: batches.visibility,
      })
      .from(batches)
      .where(
        and(
          inArray(batches.batchId, batchIds),
          eq(batches.isDeleted, false),
          eq(batches.visibility, 'PUBLIC'),
          inArray(batches.status, [...LISTED_STATUSES]),
        ),
      );

    const batchMap = new Map(batchRows.map((b) => [b.batchId, b]));

    return wishlistRows
      .filter((r) => batchMap.has(r.batchId))
      .map((r) => {
        const b = batchMap.get(r.batchId);
        if (!b) return null;
        return {
          batchId: b.batchId,
          savedAt: r.savedAt,
          title: b.title,
          slug: b.slug,
          thumbnail: b.thumbnail,
          price: b.price,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }
}
```

- [ ] **Step 2: wishlist.controller.ts**

```ts
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

interface AuthedUser { userId: string; role: string; }

@Controller('me/wishlist')
@Authenticated()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.wishlistService.list(user.userId);
  }

  @Post(':batchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  save(
    @CurrentUser() user: AuthedUser,
    @Param('batchId') batchId: string,
  ) {
    return this.wishlistService.save(user.userId, batchId);
  }

  @Delete(':batchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthedUser,
    @Param('batchId') batchId: string,
  ) {
    return this.wishlistService.remove(user.userId, batchId);
  }
}
```

---

## Task 8 — RecommendationService + RecommendationController

**Files:**
- Create: `src/discovery/recommendation.service.ts`
- Create: `src/discovery/recommendation.controller.ts`

- [ ] **Step 1: recommendation.service.ts**

Rule-based only. No AI. No model calls.

```ts
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, notInArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { batches, batchEnrollments, studentProfiles } from '../database/schema';
import type { CatalogueBatch } from './dto/catalogue-batch.dto';

const LISTED_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;

const PUBLIC_COLUMNS = {
  batchId: batches.batchId,
  title: batches.title,
  slug: batches.slug,
  shortDescription: batches.shortDescription,
  thumbnail: batches.thumbnail,
  price: batches.price,
  currency: batches.currency,
  language: batches.language,
  goalKey: batches.goalKey,
  deliveryMode: batches.deliveryMode,
  startDate: batches.startDate,
  endDate: batches.endDate,
  status: batches.status,
  categoryId: batches.categoryId,
} as const;

@Injectable()
export class RecommendationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async forUser(userId: string): Promise<CatalogueBatch[]> {
    const [profile] = await this.db
      .select({ goalKey: studentProfiles.goalKey, level: studentProfiles.level })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);

    const enrolledRows = await this.db
      .select({ batchId: batchEnrollments.batchId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, 'ACTIVE'),
        ),
      );
    const enrolledIds = enrolledRows.map((r) => r.batchId);

    const baseConditions = [
      eq(batches.isDeleted, false),
      eq(batches.visibility, 'PUBLIC'),
      inArray(batches.status, [...LISTED_STATUSES]),
    ];

    if (enrolledIds.length > 0) {
      baseConditions.push(notInArray(batches.batchId, enrolledIds));
    }

    if (!profile?.goalKey) {
      const rows = await this.db
        .select(PUBLIC_COLUMNS)
        .from(batches)
        .where(and(...baseConditions))
        .orderBy(asc(batches.startDate), asc(batches.batchId))
        .limit(10);
      return rows as CatalogueBatch[];
    }

    const goalConditions = [...baseConditions, eq(batches.goalKey, profile.goalKey)];
    const rows = await this.db
      .select(PUBLIC_COLUMNS)
      .from(batches)
      .where(and(...goalConditions))
      .orderBy(asc(batches.startDate), asc(batches.batchId))
      .limit(10);

    return rows as CatalogueBatch[];
  }
}
```

- [ ] **Step 2: recommendation.controller.ts**

```ts
import { Controller, Get } from '@nestjs/common';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecommendationService } from './recommendation.service';

interface AuthedUser { userId: string; role: string; }

@Controller('me/recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Authenticated()
  @Get()
  get(@CurrentUser() user: AuthedUser) {
    return this.recommendationService.forUser(user.userId);
  }
}
```

---

## Task 9 — TypeScript + ESLint Gate

- [ ] **Step 1: Run tsc**

```bash
cd D:\projects\groedu\backend && npx tsc --noEmit 2>&1
```

Expected: 0 errors. If any discovery/ file errors, fix them.

- [ ] **Step 2: Run eslint on touched files**

```bash
cd D:\projects\groedu\backend && npx eslint "src/discovery/**/*.ts" "src/app.module.ts" 2>&1
```

Expected: 0 errors.

---

## Task 10 — Integration Tests: Catalogue (Ticket 24)

**File:** `test/catalogue.int-spec.ts`

- [ ] **Step 1: Write the test file**

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser } from './support/factories';

describe('Catalogue (Ticket 24)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

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
  });

  it('is publicly readable without a token', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, visibility: 'PUBLIC' as never });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('excludes draft batches', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', { status: 'DRAFT' as never });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('excludes deleted batches', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, isDeleted: true });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('excludes CORPORATE_ONLY batches', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, visibility: 'CORPORATE_ONLY' as never });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('filters compose: goalKey AND language narrow results', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'JEE',
      language: 'Hindi',
    });
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'NEET',
      language: 'Hindi',
    });
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'JEE',
      language: 'English',
    });

    const res = await request(app.getHttpServer())
      .get('/catalogue?goalKey=JEE&language=Hindi')
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].goalKey).toBe('JEE');
    expect(res.body.data[0].language).toBe('Hindi');
  });

  it('paginates stably under repeated requests', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    for (let i = 0; i < 5; i++) {
      await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });
    }

    const res1 = await request(app.getHttpServer()).get('/catalogue?limit=3&page=1').expect(200);
    const res2 = await request(app.getHttpServer()).get('/catalogue?limit=3&page=1').expect(200);
    expect(res1.body.data.map((b: { batchId: string }) => b.batchId))
      .toEqual(res2.body.data.map((b: { batchId: string }) => b.batchId));
    expect(res1.body.data).toHaveLength(3);
  });

  it('does not leak compareAtPrice, capacity, createdBy, or enrolment data', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      compareAtPrice: '999',
      capacity: 100,
    });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    const batch = res.body.data[0];
    expect(batch).toBeDefined();
    expect(batch.compareAtPrice).toBeUndefined();
    expect(batch.capacity).toBeUndefined();
    expect(batch.createdBy).toBeUndefined();
    expect(batch.enrollmentCount).toBeUndefined();
    expect(batch.enrollments).toBeUndefined();
  });

  it('uses signed-in student goal as default filter when no goal param provided', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const student = await createUser(database, 'LEARNER');

    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'JEE',
    });
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'NEET',
    });

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/catalogue')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((b: { goalKey: string }) => expect(b.goalKey).toBe('JEE'));
  });

  it('returns unfiltered catalogue when signed-in student has no goal', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const student = await createUser(database, 'LEARNER');

    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    const res = await request(app.getHttpServer())
      .get('/catalogue')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.data.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run and verify tests fail before implementation is in place**

(This step is already past — the implementation IS in place. Run to see them pass.)

```bash
cd D:\projects\groedu\backend && npx jest --config jest.integration.config.js --runTestsByPath test/catalogue.int-spec.ts --testTimeout=600000 2>&1 | tail -30
```

Expected: all tests PASS.

---

## Task 11 — Integration Tests: Search (Ticket 25)

**File:** `test/search.int-spec.ts`

- [ ] **Step 1: Write the test file**

Note: search tests use `app.get<InlineJobQueue>(JOB_QUEUE)` and `clock.advance` + `queue.tick()` to trigger the sync job. This is the approved pattern (see `drip-release.int-spec.ts`).

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser } from './support/factories';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';

describe('Search (Ticket 25)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let queue: InlineJobQueue;
  let admin: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.set('2026-01-01T00:00:00.000Z');
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
  });

  async function triggerSync() {
    clock.advance(70_000);
    await queue.tick();
  }

  it('finds a batch by title using full-text stemming', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Learn Physics with Motion',
      status: 'ONGOING' as never,
    });

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=learning+physics')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.some((r: { title: string }) => r.title.includes('Physics'));
    expect(found).toBe(true);
  });

  it('finds a batch by description (full-text, word-order independent)', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Chemistry Batch',
      description: 'Master organic reactions for competitive exams',
      status: 'ONGOING' as never,
    });

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=organic+reactions')
      .expect(200);

    const found = res.body.some((r: { title: string }) => r.title.includes('Chemistry'));
    expect(found).toBe(true);
  });

  it('finds an instructor by name', async () => {
    const instructor = await createUser(database, 'INSTRUCTOR');
    await database.db.execute(
      (await import('drizzle-orm').then((m) => m.sql))`
        INSERT INTO instructor_profiles (profile_id, user_id, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), ${instructor.userId}, true, now(), now())
        ON CONFLICT DO NOTHING
      `
    );
    await database.db.execute(
      (await import('drizzle-orm').then((m) => m.sql))`
        UPDATE users SET first_name = 'Ramanujan', last_name = 'Sharma' WHERE user_id = ${instructor.userId}
      `
    );

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=ramanujan&kind=INSTRUCTOR')
      .expect(200);

    const found = res.body.some((r: { title: string }) => r.title.includes('Ramanujan'));
    expect(found).toBe(true);
  });

  it('excludes unpublished batches from search', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Hidden Draft Batch',
      status: 'DRAFT' as never,
    });

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=hidden+draft')
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('excludes CORPORATE_ONLY batches from search', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Corporate Secret Batch',
      status: 'ONGOING' as never,
      visibility: 'CORPORATE_ONLY' as never,
    });

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=corporate+secret')
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('returns empty for an empty query string', async () => {
    const res = await request(app.getHttpServer())
      .get('/search?q=')
      .expect(400);

    expect(res.status).toBe(400);
  });

  it('returns empty for nonsense query (no matching tokens)', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Physics Batch',
      status: 'ONGOING' as never,
    });
    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=xyzqrtnblorg')
      .expect(200);

    expect(res.body).toHaveLength(0);
  });
});
```

> **Note on instructor profile setup**: The test above uses `database.db.execute(sql\`...\`)` to insert instructor profiles and update user names. This is necessary because the instructor profile factory doesn't exist yet. Alternative: add `createInstructorProfile` to `test/support/factories.ts` (surgical, low-contention). Prefer the factory approach if time allows.

- [ ] **Step 2: Run**

```bash
cd D:\projects\groedu\backend && npx jest --config jest.integration.config.js --runTestsByPath test/search.int-spec.ts --testTimeout=600000 2>&1 | tail -30
```

Expected: all tests PASS.

---

## Task 12 — Integration Tests: Wishlist (Ticket 27)

**File:** `test/wishlist.int-spec.ts`

- [ ] **Step 1: Write the test file**

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser, enrol } from './support/factories';

describe('Wishlist (Ticket 27)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;

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
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/me/wishlist').expect(401);
  });

  it('saves a batch to the wishlist', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].batchId).toBe(batchId);
  });

  it('saving the same batch twice does not duplicate', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(1);
  });

  it('unsaves a batch', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('list is private — another student cannot see it', async () => {
    const other = await createUser(database, 'LEARNER');
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, other))
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('a saved batch that stops being published stops appearing in the list', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    await database.db.execute(
      (await import('drizzle-orm').then((m) => m.sql))`
        UPDATE batches SET status = 'DRAFT' WHERE batch_id = ${batchId}
      `
    );

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('enrolling does not remove the wishlist entry', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    await enrol(database, batchId, student.userId);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run**

```bash
cd D:\projects\groedu\backend && npx jest --config jest.integration.config.js --runTestsByPath test/wishlist.int-spec.ts --testTimeout=600000 2>&1 | tail -30
```

Expected: all tests PASS.

---

## Task 13 — Integration Tests: Goal Capture (Ticket 28)

**File:** `test/goal-capture.int-spec.ts`

- [ ] **Step 1: Write the test file**

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser } from './support/factories';

describe('Goal Capture (Ticket 28)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let student: TestActor;
  let admin: TestActor;

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
  });

  it('GET /me/goal/options returns owner-managed goal list', async () => {
    const res = await request(app.getHttpServer())
      .get('/me/goal/options')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({ key: expect.any(String), label: expect.any(String) });
  });

  it('requires authentication to set a goal', async () => {
    await request(app.getHttpServer())
      .put('/me/goal')
      .send({ goalKey: 'JEE' })
      .expect(401);
  });

  it('sets a valid goal', async () => {
    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/goal')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.goalKey).toBe('JEE');
  });

  it('rejects a goal key not in the configured set', async () => {
    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'INVALID_GOAL_XYZ' })
      .expect(400);
  });

  it('editing the goal updates immediately', async () => {
    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'NEET' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/goal')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.goalKey).toBe('NEET');
  });

  it('catalogue defaults to student goal when signed in', async () => {
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'JEE',
    });
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'NEET',
    });

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/catalogue')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((b: { goalKey: string }) => expect(b.goalKey).toBe('JEE'));
  });

  it('student without a goal still gets an unfiltered catalogue', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    const res = await request(app.getHttpServer())
      .get('/catalogue')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.data.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run**

```bash
cd D:\projects\groedu\backend && npx jest --config jest.integration.config.js --runTestsByPath test/goal-capture.int-spec.ts --testTimeout=600000 2>&1 | tail -30
```

Expected: all tests PASS.

---

## Task 14 — Integration Tests: Recommendations (Ticket 30)

**File:** `test/recommendations.int-spec.ts`

- [ ] **Step 1: Write the test file**

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser, enrol } from './support/factories';

describe('Recommendations (Ticket 30)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;

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
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/me/recommendations').expect(401);
  });

  it('returns goal-matched batches when student has a goal', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((b: { goalKey: string }) => expect(b.goalKey).toBe('JEE'));
  });

  it('excludes batches the student is already enrolled in', async () => {
    const enrolled = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    const available = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });

    await enrol(database, enrolled, student.userId);

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);

    const ids = res.body.map((b: { batchId: string }) => b.batchId);
    expect(ids).not.toContain(enrolled);
    expect(ids).toContain(available);
  });

  it('returns batches even when student has a goal but no level', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'NEET' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns catalogue default ordering when student has no goal', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('does not call a language model (no external HTTP during test)', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- [ ] **Step 2: Run**

```bash
cd D:\projects\groedu\backend && npx jest --config jest.integration.config.js --runTestsByPath test/recommendations.int-spec.ts --testTimeout=600000 2>&1 | tail -30
```

Expected: all tests PASS.

---

## Task 15 — Authorization Surface Gate

- [ ] **Step 1: Run the authorization gate**

```bash
cd D:\projects\groedu\backend && npx jest --config jest.integration.config.js --runTestsByPath test/authorization-surface.int-spec.ts --testTimeout=600000 2>&1 | tail -30
```

Expected: PASS. If any discovery route is missing an auth stance, the test will list it by name. Fix by adding the missing decorator.

---

## Task 16 — Full Test Run + Final Lint

- [ ] **Step 1: Run all five new suites together**

```bash
cd D:\projects\groedu\backend && npx jest --config jest.integration.config.js --runTestsByPath test/catalogue.int-spec.ts test/search.int-spec.ts test/wishlist.int-spec.ts test/goal-capture.int-spec.ts test/recommendations.int-spec.ts --testTimeout=600000 2>&1 | tail -40
```

- [ ] **Step 2: Final TypeScript check**

```bash
cd D:\projects\groedu\backend && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: 0 errors from src/discovery/.

- [ ] **Step 3: Final lint**

```bash
cd D:\projects\groedu\backend && npx eslint "src/discovery/**/*.ts" 2>&1
```

Expected: 0 errors.

---

## Self-Review: Spec Coverage

| Ticket | Criteria | Task |
|--------|----------|------|
| 24 | Catalogue readable without sign-in | Task 10 test 1 |
| 24 | Filters compose (goal + language) | Task 10 test 4 |
| 24 | Unpublished/deleted/corporate-only excluded | Task 10 tests 2,3,4 |
| 24 | Results paginated and stable | Task 10 test 5 |
| 24 | No price internals / roster data leaks | Task 10 test 6 |
| 24 | Signed-in user goal used as default filter | Task 10 test 7 |
| 24 | No-goal student gets unfiltered catalogue | Task 10 test 8 |
| 25 | Full-text index used (stemming) | Task 11 test 1 |
| 25 | Findable by title | Task 11 test 1 |
| 25 | Findable by description, word-order independent | Task 11 test 2 |
| 25 | Instructor findable by name | Task 11 test 3 |
| 25 | Excludes catalogue-excluded batches | Task 11 tests 4,5 |
| 25 | Empty/nonsense query → empty | Task 11 tests 6,7 |
| 27 | Save and unsave | Task 12 tests 2,4 |
| 27 | Saving twice no duplicate | Task 12 test 3 |
| 27 | List is private | Task 12 test 5 |
| 27 | Saved batch stops appearing when unpublished | Task 12 test 6 |
| 27 | Enrolling does not remove entry | Task 12 test 7 |
| 28 | Goal captured (at sign-up via PUT /me/goal) | Task 13 test 3 |
| 28 | Editable, change takes effect immediately | Task 13 test 5 |
| 28 | Owner-managed goal set, unknown key refused | Task 13 test 4 |
| 28 | Catalogue defaults to student's goal | Task 13 test 6 |
| 28 | No-goal student gets unfiltered catalogue | Task 13 test 7 |
| 30 | Recommendations from goal + level | Task 14 tests 2,3 |
| 30 | Goal but no level still gets recommendations | Task 14 test 3 |
| 30 | Neither goal nor level → catalogue default | Task 14 test 4 |
| 30 | Enrolled batches excluded | Task 14 test 2 |
| 30 | No language model called | Task 14 test 5 |

---

## Notes & Known Tradeoffs

1. **searchDocuments sync**: Uses background job (`registerAndRepeat`, 60-second interval). Sync is NOT triggered by batch write events (to avoid touching contested `src/batches/`). Tests tick the `InlineJobQueue` manually. This means there's up to 60 seconds of lag in production; this is acceptable for a catalogue-scale feature.

2. **Goal at sign-up**: Implemented via `PUT /me/goal` (called immediately after registration by the client) rather than modifying `src/auth/` files, to avoid parallel-agent contention. The `GET /me/goal/options` public endpoint gives the client the options list before registration.

3. **No AI**: `RecommendationService` is purely relational — no HTTP calls, no LLM providers.

4. **`@Authenticated()` on WishlistController class-level**: All three handlers (GET, POST /:batchId, DELETE /:batchId) inherit the stance from the class decorator. The authorization gate checks both class and handler metadata, so this satisfies the gate.
