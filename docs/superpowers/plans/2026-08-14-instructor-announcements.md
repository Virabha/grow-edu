# Instructor Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the instructor Announcement feature end-to-end — instructors post announcements to their courses, enrolled students read them.

**Architecture:** New `AnnouncementsModule` in `backend/src/announcements/` with its own service and controller; wired into `CoursesModule` (not `app.module.ts`, which is off-limits). On the frontend, a new `features/announcements/` slice with TanStack Query hooks feeds the `instructor/announcements/page.tsx` page.

**Tech Stack:** NestJS + Drizzle ORM (Postgres), class-validator DTOs, Jest for tests; Next.js 14 App Router, TanStack Query v5, React Hook Form + Zod, Shadcn UI `FormSheet`, Tailwind CSS.

---

## File Map

### Backend — new files

| File | Responsibility |
|---|---|
| `backend/src/announcements/dto/create-announcement.dto.ts` | CreateAnnouncementDto with validation |
| `backend/src/announcements/dto/update-announcement.dto.ts` | UpdateAnnouncementDto (partial) |
| `backend/src/announcements/announcements.service.ts` | All DB logic + ownership/enrollment checks |
| `backend/src/announcements/announcements.controller.ts` | HTTP routing, guards, auth decorators |
| `backend/src/announcements/announcements.module.ts` | NestJS module wiring |
| `backend/src/announcements/announcements.controller.spec.ts` | Jest tests for ownership & access |

### Backend — modified

| File | Change |
|---|---|
| `backend/src/courses/courses.module.ts` | Import `AnnouncementsModule` so its controller routes register |

### Frontend — new files

| File | Responsibility |
|---|---|
| `frontend/admin/src/features/announcements/types/index.ts` | TS interfaces |
| `frontend/admin/src/features/announcements/api/announcements.api.ts` | Raw API calls |
| `frontend/admin/src/features/announcements/hooks/use-announcements.ts` | TanStack Query hooks |
| `frontend/admin/src/features/announcements/components/announcement-form-sheet.tsx` | Create / edit Sheet |
| `frontend/admin/src/app/(authenticated)/instructor/announcements/page.tsx` | Main page |

---

## Task 1: Backend DTOs

**Files:**
- Create: `backend/src/announcements/dto/create-announcement.dto.ts`
- Create: `backend/src/announcements/dto/update-announcement.dto.ts`

- [ ] **Step 1: Write create DTO**

```typescript
// backend/src/announcements/dto/create-announcement.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Short subject line', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200) // [Q] 200 chars for title feels right; raise to 300 if instructors complain
  title: string;

  @ApiProperty({ description: 'Full announcement body', maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000) // [Q] 10 k chars; long but announcements can be detailed
  body: string;
}
```

- [ ] **Step 2: Write update DTO**

```typescript
// backend/src/announcements/dto/update-announcement.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementDto } from './create-announcement.dto';

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/announcements/dto/create-announcement.dto.ts \
        backend/src/announcements/dto/update-announcement.dto.ts
git commit -m "feat(announcements): add DTOs with validation"
```

---

## Task 2: Backend Service

**Files:**
- Create: `backend/src/announcements/announcements.service.ts`

The service implements ownership and enrollment checks without N+1 queries. Key rules:
- Instructor writes: course must exist **and** `courses.instructorId = caller.userId`; else 404 (never 403).
- Admin writes: course must exist; no ownership check.
- Student reads: course must exist, caller must have an `ACTIVE` enrollment in it.
- Instructor reads: same ownership rule as writes (404 if not owner).
- `listMine`: one `INNER JOIN` on `courses` — no per-row queries.

- [ ] **Step 1: Create service file**

```typescript
// backend/src/announcements/announcements.service.ts
import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  courseAnnouncements,
  courses,
  enrollments,
} from '../database/schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

type DbType = PostgresJsDatabase<typeof schema>;

const MAX_PAGE_LIMIT = 100;

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
  ) {}

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Loads course owned by instructorId.  Returns null (never throws) so callers
   *  can respond with 404 without leaking whether the course exists at all. */
  private async loadCourseForInstructor(
    courseId: string,
    instructorId: string,
  ): Promise<{ courseId: string } | null> {
    const [course] = await this.db
      .select({ courseId: courses.courseId })
      .from(courses)
      .where(
        and(
          eq(courses.courseId, courseId),
          eq(courses.instructorId, instructorId),
        ),
      )
      .limit(1);
    return course ?? null;
  }

  private async assertCourseExists(courseId: string): Promise<void> {
    const [course] = await this.db
      .select({ courseId: courses.courseId })
      .from(courses)
      .where(eq(courses.courseId, courseId))
      .limit(1);
    if (!course) throw new NotFoundException('Course not found');
  }

  private async assertEnrolled(
    courseId: string,
    userId: string,
  ): Promise<void> {
    const [row] = await this.db
      .select({ enrollmentId: enrollments.enrollmentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, courseId),
          eq(enrollments.userId, userId),
          eq(enrollments.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (!row) throw new ForbiddenException('Not enrolled in this course');
  }

  // ── Public methods ────────────────────────────────────────────────────────

  /** POST /courses/:courseId/announcements */
  async create(
    courseId: string,
    dto: CreateAnnouncementDto,
    caller: { userId: string; role: string },
  ) {
    const isAdmin = caller.role === 'PLATFORM_ADMIN';
    if (isAdmin) {
      await this.assertCourseExists(courseId);
    } else {
      const course = await this.loadCourseForInstructor(courseId, caller.userId);
      if (!course) throw new NotFoundException('Course not found');
    }
    const [created] = await this.db
      .insert(courseAnnouncements)
      .values({
        courseId,
        instructorId: caller.userId,
        title: dto.title,
        body: dto.body,
      })
      .returning();
    return created;
  }

  /** GET /courses/:courseId/announcements */
  async listByCourse(
    courseId: string,
    caller: { userId: string; role: string },
  ) {
    const isAdmin = caller.role === 'PLATFORM_ADMIN';
    const isInstructor = caller.role === 'INSTRUCTOR';

    if (isAdmin) {
      await this.assertCourseExists(courseId);
    } else if (isInstructor) {
      // Instructor must own the course — return 404 if not
      const course = await this.loadCourseForInstructor(courseId, caller.userId);
      if (!course) throw new NotFoundException('Course not found');
    } else {
      // Student path: course must exist and caller must be enrolled
      await this.assertCourseExists(courseId);
      await this.assertEnrolled(courseId, caller.userId);
    }

    return this.db
      .select()
      .from(courseAnnouncements)
      .where(eq(courseAnnouncements.courseId, courseId))
      .orderBy(desc(courseAnnouncements.createdAt)); // uses course_announcements_course_created_idx
  }

  /** PATCH /announcements/:id — author or admin only; non-author gets 404 */
  async update(
    announcementId: string,
    dto: UpdateAnnouncementDto,
    caller: { userId: string; role: string },
  ) {
    const isAdmin = caller.role === 'PLATFORM_ADMIN';
    const [existing] = await this.db
      .select()
      .from(courseAnnouncements)
      .where(eq(courseAnnouncements.announcementId, announcementId))
      .limit(1);
    if (!existing || (!isAdmin && existing.instructorId !== caller.userId)) {
      throw new NotFoundException('Announcement not found');
    }
    const [updated] = await this.db
      .update(courseAnnouncements)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        updatedAt: new Date(),
      })
      .where(eq(courseAnnouncements.announcementId, announcementId))
      .returning();
    return updated;
  }

  /** DELETE /announcements/:id — author or admin only; non-author gets 404 */
  async remove(
    announcementId: string,
    caller: { userId: string; role: string },
  ) {
    const isAdmin = caller.role === 'PLATFORM_ADMIN';
    const [existing] = await this.db
      .select()
      .from(courseAnnouncements)
      .where(eq(courseAnnouncements.announcementId, announcementId))
      .limit(1);
    if (!existing || (!isAdmin && existing.instructorId !== caller.userId)) {
      throw new NotFoundException('Announcement not found');
    }
    await this.db
      .delete(courseAnnouncements)
      .where(eq(courseAnnouncements.announcementId, announcementId));
    return { success: true as const };
  }

  /** GET /announcements/mine — paginated, single JOIN, no N+1 */
  async listMine(
    caller: { userId: string; role: string },
    pagination: PaginationDto,
  ) {
    const page = pagination.page ?? 1;
    const limit = Math.min(pagination.limit ?? 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const isAdmin = caller.role === 'PLATFORM_ADMIN';

    // Admin sees all; instructor sees only their courses' announcements
    const ownerFilter = isAdmin
      ? undefined
      : eq(courses.instructorId, caller.userId);

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          announcementId: courseAnnouncements.announcementId,
          courseId: courseAnnouncements.courseId,
          instructorId: courseAnnouncements.instructorId,
          title: courseAnnouncements.title,
          body: courseAnnouncements.body,
          createdAt: courseAnnouncements.createdAt,
          updatedAt: courseAnnouncements.updatedAt,
          courseTitle: courses.title,
        })
        .from(courseAnnouncements)
        .innerJoin(courses, eq(courseAnnouncements.courseId, courses.courseId))
        .where(ownerFilter)
        .orderBy(desc(courseAnnouncements.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseAnnouncements)
        .innerJoin(courses, eq(courseAnnouncements.courseId, courses.courseId))
        .where(ownerFilter),
    ]);

    const total = countRows[0]?.count ?? 0;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/announcements/announcements.service.ts
git commit -m "feat(announcements): add service with ownership and enrollment checks"
```

---

## Task 3: Backend Controller

**Files:**
- Create: `backend/src/announcements/announcements.controller.ts`

The controller uses `@Controller('')` (empty base) so it can handle both `/courses/:courseId/announcements` and `/announcements/mine` paths from a single class. `GET /announcements/mine` must be declared BEFORE `GET /announcements/:id` to avoid NestJS routing conflicts.

- [ ] **Step 1: Create controller**

```typescript
// backend/src/announcements/announcements.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('announcements')
@Controller('')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // ── IMPORTANT: /announcements/mine MUST be declared before /announcements/:id ──

  @ApiOperation({ summary: 'List all announcements across my courses (paginated)' })
  @ApiResponse({ status: 200 })
  @Get('announcements/mine')
  listMine(
    @CurrentUser() user: { userId: string; role: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.announcementsService.listMine(user, pagination);
  }

  @ApiOperation({ summary: 'Post an announcement to a course' })
  @ApiResponse({ status: 201 })
  @Post('courses/:courseId/announcements')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.create(courseId, dto, user);
  }

  @ApiOperation({ summary: 'List announcements for a course' })
  @ApiResponse({ status: 200 })
  @Get('courses/:courseId/announcements')
  listByCourse(
    @Param('courseId') courseId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.listByCourse(courseId, user);
  }

  @ApiOperation({ summary: 'Update an announcement' })
  @ApiResponse({ status: 200 })
  @Patch('announcements/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.update(id, dto, user);
  }

  @ApiOperation({ summary: 'Delete an announcement' })
  @ApiResponse({ status: 200 })
  @Delete('announcements/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.announcementsService.remove(id, user);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/announcements/announcements.controller.ts
git commit -m "feat(announcements): add controller with 5 endpoints"
```

---

## Task 4: Backend Module + Wire-up

**Files:**
- Create: `backend/src/announcements/announcements.module.ts`
- Modify: `backend/src/courses/courses.module.ts`

- [ ] **Step 1: Create module**

```typescript
// backend/src/announcements/announcements.module.ts
import { Module } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
```

- [ ] **Step 2: Import AnnouncementsModule into CoursesModule**

Read the current content of `backend/src/courses/courses.module.ts`, then replace it with:

```typescript
// backend/src/courses/courses.module.ts
import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';
import { EmailModule } from '../email/email.module';
import { AnnouncementsModule } from '../announcements/announcements.module';

@Module({
  imports: [DatabaseModule, FilesModule, EmailModule, AnnouncementsModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
```

- [ ] **Step 3: Typecheck**

```bash
cd D:\projects\groedu\backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/announcements/announcements.module.ts \
        backend/src/courses/courses.module.ts
git commit -m "feat(announcements): wire AnnouncementsModule into CoursesModule"
```

---

## Task 5: Backend Tests

**Files:**
- Create: `backend/src/announcements/announcements.controller.spec.ts`

Four tests required by spec: owner can post, non-owner is rejected, enrolled student can read, non-enrolled student cannot.

- [ ] **Step 1: Write test file**

```typescript
// backend/src/announcements/announcements.controller.spec.ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { UserRole } from '../auth/decorators/roles.decorator';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COURSE_ID = 'course-abc';
const OWNER_ID = 'instructor-owner';
const OTHER_ID = 'instructor-other';
const ADMIN_ID = 'admin-user';
const STUDENT_ID = 'student-enrolled';
const NON_STUDENT_ID = 'student-not-enrolled';
const ANNOUNCEMENT_ID = 'ann-1';

const FAKE_ANNOUNCEMENT = {
  announcementId: ANNOUNCEMENT_ID,
  courseId: COURSE_ID,
  instructorId: OWNER_ID,
  title: 'Test',
  body: 'Body',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Mock helpers ───────────────────────────────────────────────────────────────

type ServiceMock = {
  create: jest.Mock;
  listByCourse: jest.Mock;
  listMine: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

async function buildController(): Promise<{
  controller: AnnouncementsController;
  svc: ServiceMock;
}> {
  const svc: ServiceMock = {
    create: jest.fn(),
    listByCourse: jest.fn(),
    listMine: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [AnnouncementsController],
    providers: [{ provide: AnnouncementsService, useValue: svc }],
  }).compile();

  return {
    controller: moduleRef.get(AnnouncementsController),
    svc,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AnnouncementsController › create', () => {
  let controller: AnnouncementsController;
  let svc: ServiceMock;

  beforeEach(async () => {
    ({ controller, svc } = await buildController());
  });

  it('owner can post — delegates to service and returns created announcement', async () => {
    svc.create.mockResolvedValue(FAKE_ANNOUNCEMENT);

    const result = await controller.create(
      COURSE_ID,
      { title: 'Test', body: 'Body' },
      { userId: OWNER_ID, role: UserRole.INSTRUCTOR },
    );

    expect(svc.create).toHaveBeenCalledWith(
      COURSE_ID,
      { title: 'Test', body: 'Body' },
      { userId: OWNER_ID, role: UserRole.INSTRUCTOR },
    );
    expect(result).toEqual(FAKE_ANNOUNCEMENT);
  });

  it('non-owner instructor gets NotFoundException (service throws it)', async () => {
    svc.create.mockRejectedValue(new NotFoundException('Course not found'));

    await expect(
      controller.create(
        COURSE_ID,
        { title: 'Test', body: 'Body' },
        { userId: OTHER_ID, role: UserRole.INSTRUCTOR },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('admin can post regardless of course ownership', async () => {
    svc.create.mockResolvedValue(FAKE_ANNOUNCEMENT);

    const result = await controller.create(
      COURSE_ID,
      { title: 'Test', body: 'Body' },
      { userId: ADMIN_ID, role: UserRole.PLATFORM_ADMIN },
    );

    expect(result).toEqual(FAKE_ANNOUNCEMENT);
  });
});

describe('AnnouncementsController › listByCourse (read access)', () => {
  let controller: AnnouncementsController;
  let svc: ServiceMock;

  beforeEach(async () => {
    ({ controller, svc } = await buildController());
  });

  it('enrolled student can read — service returns list', async () => {
    svc.listByCourse.mockResolvedValue([FAKE_ANNOUNCEMENT]);

    const result = await controller.listByCourse(COURSE_ID, {
      userId: STUDENT_ID,
      role: UserRole.LEARNER,
    });

    expect(result).toEqual([FAKE_ANNOUNCEMENT]);
  });

  it('non-enrolled student gets ForbiddenException (service throws it)', async () => {
    svc.listByCourse.mockRejectedValue(
      new ForbiddenException('Not enrolled in this course'),
    );

    await expect(
      controller.listByCourse(COURSE_ID, {
        userId: NON_STUDENT_ID,
        role: UserRole.LEARNER,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('course owner can always read', async () => {
    svc.listByCourse.mockResolvedValue([FAKE_ANNOUNCEMENT]);

    const result = await controller.listByCourse(COURSE_ID, {
      userId: OWNER_ID,
      role: UserRole.INSTRUCTOR,
    });

    expect(result).toEqual([FAKE_ANNOUNCEMENT]);
  });

  it('non-owner instructor gets NotFoundException', async () => {
    svc.listByCourse.mockRejectedValue(new NotFoundException('Course not found'));

    await expect(
      controller.listByCourse(COURSE_ID, {
        userId: OTHER_ID,
        role: UserRole.INSTRUCTOR,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('AnnouncementsController › update', () => {
  let controller: AnnouncementsController;
  let svc: ServiceMock;

  beforeEach(async () => {
    ({ controller, svc } = await buildController());
  });

  it('author can update', async () => {
    svc.update.mockResolvedValue({ ...FAKE_ANNOUNCEMENT, title: 'Updated' });

    const result = await controller.update(
      ANNOUNCEMENT_ID,
      { title: 'Updated' },
      { userId: OWNER_ID, role: UserRole.INSTRUCTOR },
    );

    expect(result.title).toBe('Updated');
  });

  it('non-author gets NotFoundException', async () => {
    svc.update.mockRejectedValue(new NotFoundException('Announcement not found'));

    await expect(
      controller.update(
        ANNOUNCEMENT_ID,
        { title: 'Hack' },
        { userId: OTHER_ID, role: UserRole.INSTRUCTOR },
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('AnnouncementsController › remove', () => {
  let controller: AnnouncementsController;
  let svc: ServiceMock;

  beforeEach(async () => {
    ({ controller, svc } = await buildController());
  });

  it('author can delete', async () => {
    svc.remove.mockResolvedValue({ success: true });

    const result = await controller.remove(ANNOUNCEMENT_ID, {
      userId: OWNER_ID,
      role: UserRole.INSTRUCTOR,
    });

    expect(result.success).toBe(true);
  });

  it('non-author gets NotFoundException', async () => {
    svc.remove.mockRejectedValue(new NotFoundException('Announcement not found'));

    await expect(
      controller.remove(ANNOUNCEMENT_ID, {
        userId: OTHER_ID,
        role: UserRole.INSTRUCTOR,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd D:\projects\groedu\backend && pnpm test -- --testPathPattern=announcements --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3: Full backend check**

```bash
cd D:\projects\groedu\backend && npx tsc --noEmit && npx eslint "src/**/*.ts" && pnpm test
```

Expected: exit 0 on all three.

- [ ] **Step 4: Commit**

```bash
git add backend/src/announcements/announcements.controller.spec.ts
git commit -m "test(announcements): controller ownership + enrollment spec"
```

---

## Task 6: Frontend Types and API

**Files:**
- Create: `frontend/admin/src/features/announcements/types/index.ts`
- Create: `frontend/admin/src/features/announcements/api/announcements.api.ts`

- [ ] **Step 1: Write types**

```typescript
// frontend/admin/src/features/announcements/types/index.ts

export interface CourseAnnouncement {
  announcementId: string;
  courseId: string;
  instructorId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseAnnouncementWithCourse extends CourseAnnouncement {
  courseTitle: string;
}

export interface AnnouncementsListResponse {
  data: CourseAnnouncementWithCourse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateAnnouncementDto {
  title: string;
  body: string;
}

export type UpdateAnnouncementDto = Partial<CreateAnnouncementDto>;

export interface AnnouncementFilters {
  page?: number;
  limit?: number;
}
```

- [ ] **Step 2: Write API layer**

```typescript
// frontend/admin/src/features/announcements/api/announcements.api.ts
import { apiClient } from '@/lib/api/client';
import type {
  AnnouncementFilters,
  AnnouncementsListResponse,
  CourseAnnouncement,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '../types';

export const announcementsApi = {
  /** GET /announcements/mine — instructor dashboard list */
  listMine: async (filters?: AnnouncementFilters): Promise<AnnouncementsListResponse> => {
    const { data } = await apiClient.get<AnnouncementsListResponse>(
      '/announcements/mine',
      { params: filters },
    );
    return data;
  },

  /** POST /courses/:courseId/announcements */
  create: async (
    courseId: string,
    dto: CreateAnnouncementDto,
  ): Promise<CourseAnnouncement> => {
    const { data } = await apiClient.post<CourseAnnouncement>(
      `/courses/${courseId}/announcements`,
      dto,
    );
    return data;
  },

  /** PATCH /announcements/:id */
  update: async (
    announcementId: string,
    dto: UpdateAnnouncementDto,
  ): Promise<CourseAnnouncement> => {
    const { data } = await apiClient.patch<CourseAnnouncement>(
      `/announcements/${announcementId}`,
      dto,
    );
    return data;
  },

  /** DELETE /announcements/:id */
  remove: async (announcementId: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/announcements/${announcementId}`,
    );
    return data;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/admin/src/features/announcements/types/index.ts \
        frontend/admin/src/features/announcements/api/announcements.api.ts
git commit -m "feat(announcements): frontend types and API layer"
```

---

## Task 7: Frontend TanStack Query Hooks

**Files:**
- Create: `frontend/admin/src/features/announcements/hooks/use-announcements.ts`

- [ ] **Step 1: Write hooks**

```typescript
// frontend/admin/src/features/announcements/hooks/use-announcements.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { announcementsApi } from '../api/announcements.api';
import type {
  AnnouncementFilters,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '../types';

function getErrorMessage(error: Error, fallback: string): string {
  const axiosErr = error as AxiosError<{ message?: string }>;
  return axiosErr?.response?.data?.message ?? fallback;
}

export const announcementKeys = {
  all: ['announcements'] as const,
  mine: (filters?: AnnouncementFilters) =>
    [...announcementKeys.all, 'mine', filters] as const,
};

export function useMyAnnouncements(filters?: AnnouncementFilters) {
  return useQuery({
    queryKey: announcementKeys.mine(filters),
    queryFn: () => announcementsApi.listMine(filters),
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      dto,
    }: {
      courseId: string;
      dto: CreateAnnouncementDto;
    }) => announcementsApi.create(courseId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      toast.success('Announcement posted');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to post announcement'));
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      announcementId,
      dto,
    }: {
      announcementId: string;
      dto: UpdateAnnouncementDto;
    }) => announcementsApi.update(announcementId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      toast.success('Announcement updated');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to update announcement'));
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) =>
      announcementsApi.remove(announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      toast.success('Announcement deleted');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to delete announcement'));
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/admin/src/features/announcements/hooks/use-announcements.ts
git commit -m "feat(announcements): TanStack Query hooks"
```

---

## Task 8: Frontend Form Sheet Component

**Files:**
- Create: `frontend/admin/src/features/announcements/components/announcement-form-sheet.tsx`

This follows the identical pattern used in `features/batches/components/announcement-form-dialog.tsx` — uses `FormSheet`, `react-hook-form` + Zod, course dropdown from existing `useCourses` hook.

- [ ] **Step 1: Write form sheet**

```typescript
// frontend/admin/src/features/announcements/components/announcement-form-sheet.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSheet } from "@/components/ui/form-sheet";
import { useCourses } from "@/features/courses/hooks/use-courses";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
} from "../hooks/use-announcements";
import type { CourseAnnouncementWithCourse } from "../types";

const FIELD_CLS = "h-8 text-xs";
const LABEL_CLS = "text-xs font-medium";

const schema = z.object({
  courseId: z.string().min(1, "Please select a course"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  body: z
    .string()
    .min(1, "Message is required")
    .max(10000, "Message must be 10 000 characters or fewer"),
});

type Values = z.infer<typeof schema>;
const defaults: Values = { courseId: "", title: "", body: "" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: CourseAnnouncementWithCourse | null;
}

export function AnnouncementFormSheet({
  open,
  onOpenChange,
  announcement,
}: Props) {
  const isEditing = !!announcement;
  const { user } = useAuthStore();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();

  const { data: coursesData } = useCourses({
    enabled: open,
    filters: { instructorId: user?.id, limit: 100 },
  });
  const courses = coursesData?.data ?? [];

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    if (announcement) {
      form.reset({
        courseId: announcement.courseId,
        title: announcement.title,
        body: announcement.body,
      });
    } else {
      form.reset(defaults);
    }
  }, [open, announcement, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
    if (isEditing && announcement) {
      update.mutate(
        {
          announcementId: announcement.announcementId,
          dto: { title: values.title, body: values.body },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(
        { courseId: values.courseId, dto: { title: values.title, body: values.body } },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit announcement" : "Create announcement"}
      description="Notify all enrolled students in the selected course."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEditing ? "Save changes" : "Post"}
      submitting={isPending}
      size="md"
    >
      <Form {...form}>
        <div className="space-y-3">
          {/* Course selector — hidden when editing (course is locked) */}
          {!isEditing && (
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Course</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className={FIELD_CLS}>
                        <SelectValue placeholder="Select a course…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.courseId} value={c.courseId}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLS}>Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className={FIELD_CLS}
                    placeholder="e.g. Live class rescheduled"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLS}>Message</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={8}
                    className="min-h-[160px] text-xs"
                    placeholder="Write your announcement here…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </FormSheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/admin/src/features/announcements/components/announcement-form-sheet.tsx
git commit -m "feat(announcements): AnnouncementFormSheet component"
```

---

## Task 9: Frontend Page

**Files:**
- Create: `frontend/admin/src/app/(authenticated)/instructor/announcements/page.tsx`

This is the main instructor announcements page. It matches the screenshots (table with No / Course / Title / Date / Action columns, "Create Announcement" button top-right) and the house style of `instructor/courses/page.tsx` and `admin/coupons/page.tsx`.

All five states are handled: loading skeleton, empty with CTA, error with retry, success list, pagination.

- [ ] **Step 1: Write page**

```typescript
// frontend/admin/src/app/(authenticated)/instructor/announcements/page.tsx
"use client";

import { useState, useCallback } from "react";
import { Megaphone, Pencil, Trash2 } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useMyAnnouncements,
  useDeleteAnnouncement,
} from "@/features/announcements/hooks/use-announcements";
import { AnnouncementFormSheet } from "@/features/announcements/components/announcement-form-sheet";
import type { CourseAnnouncementWithCourse } from "@/features/announcements/types";

export default function InstructorAnnouncementsPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseAnnouncementWithCourse | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<CourseAnnouncementWithCourse | null>(
    null,
  );

  const { data, isLoading, isError, refetch } = useMyAnnouncements({ page, limit: 20 });
  const deleteAnnouncement = useDeleteAnnouncement();

  const announcements = data?.data ?? [];
  const pagination = data?.pagination;

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (announcement: CourseAnnouncementWithCourse) => {
    setEditing(announcement);
    setFormOpen(true);
  };

  const handleDeleteRequest = useCallback(
    (announcement: CourseAnnouncementWithCourse) => {
      setDeleting(announcement);
      setConfirmOpen(true);
    },
    [],
  );

  const onConfirmDelete = useCallback(() => {
    if (deleting) {
      deleteAnnouncement.mutate(deleting.announcementId);
    }
  }, [deleting, deleteAnnouncement]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <PageLayout
      subtitle="Studio"
      header="Announcements"
      description="Post updates to your enrolled students."
      actions={
        <Button size="sm" onClick={handleCreate} className="gap-1.5">
          <Megaphone className="size-3.5" />
          Create Announcement
        </Button>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={8} />
      ) : isError ? (
        <EmptyState
          title="Failed to load announcements"
          description="Something went wrong. Try again."
          icon={<Megaphone className="h-12 w-12" />}
          action={{ label: "Retry", onClick: () => refetch() }}
        />
      ) : announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Post your first announcement to notify enrolled students."
          icon={<Megaphone className="h-12 w-12" />}
          action={{ label: "Create Announcement", onClick: handleCreate }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-border/70">
                  <TableHead className="w-12 font-display text-xs">No</TableHead>
                  <TableHead className="font-display text-xs">Course</TableHead>
                  <TableHead className="font-display text-xs">Title</TableHead>
                  <TableHead className="font-display text-xs">Date</TableHead>
                  <TableHead className="text-right font-display text-xs">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((ann, idx) => (
                  <TableRow
                    key={ann.announcementId}
                    className="border-b-border/60 transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {((pagination?.page ?? 1) - 1) * (pagination?.limit ?? 20) +
                        idx +
                        1}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm font-medium">
                      {ann.courseTitle}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm">
                      {ann.title}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(ann.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(ann)}
                          aria-label="Edit announcement"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRequest(ann)}
                          aria-label="Delete announcement"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page{" "}
                <span className="text-foreground">{pagination.page}</span> of{" "}
                <span className="text-foreground">{pagination.totalPages}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnnouncementFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        announcement={editing}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete announcement?"
        description={`"${deleting?.title ?? ""}" will be permanently removed and students will no longer see it.`}
        onConfirm={onConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
```

- [ ] **Step 2: Frontend typecheck**

```bash
cd D:\projects\groedu\frontend\admin && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Frontend lint**

```bash
cd D:\projects\groedu\frontend\admin && npx eslint .
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/admin/src/app/\(authenticated\)/instructor/announcements/page.tsx
git commit -m "feat(announcements): instructor announcements page"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Backend typecheck**

```bash
cd D:\projects\groedu\backend && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 2: Backend lint**

```bash
cd D:\projects\groedu\backend && npx eslint "src/**/*.ts"
```

Expected: exit 0.

- [ ] **Step 3: Backend tests**

```bash
cd D:\projects\groedu\backend && pnpm test
```

Expected: all tests pass, including the new announcements spec.

- [ ] **Step 4: Frontend typecheck**

```bash
cd D:\projects\groedu\frontend\admin && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Frontend lint**

```bash
cd D:\projects\groedu\frontend\admin && npx eslint .
```

Expected: exit 0.

---

## Self-Review Checklist

### Spec coverage
- [x] `POST /courses/:courseId/announcements` — owner/admin only ✓ (Task 3, enforced in service Task 2)
- [x] `GET /courses/:courseId/announcements` — owner/admin + enrolled student ✓
- [x] `PATCH /announcements/:id` — author or admin, 404 for non-author ✓
- [x] `DELETE /announcements/:id` — author or admin, 404 for non-author ✓
- [x] `GET /announcements/mine` — paginated, single JOIN ✓
- [x] Ownership enforced server-side on every write ✓
- [x] Student read requires active enrolment ✓
- [x] Cross-owner write = 404 ✓ (`loadCourseForInstructor` returns null → NotFoundException)
- [x] Reuse `PaginationDto` (max 100) ✓
- [x] No N+1: `listMine` uses one `innerJoin`, `listByCourse` is one query ✓
- [x] `(course_id, created_at)` index used by `orderBy(desc(createdAt))` in `listByCourse` ✓
- [x] class-validator on title (max 200 `// [Q]`) and body (max 10000 `// [Q]`) ✓
- [x] `AnnouncementsModule` wired via `CoursesModule`, not `app.module.ts` ✓
- [x] Do NOT edit `backend/src/app.module.ts` ✓ (CoursesModule is edited instead)
- [x] Do NOT edit `backend/src/database/schema.ts` ✓
- [x] Do NOT edit anything under `backend/src/batches/` ✓
- [x] Do NOT edit `frontend/admin/src/components/layout/instructor-navbar.tsx` ✓
- [x] No `any`, no `as unknown as`, no non-null assertions ✓
- [x] Frontend uses TanStack hooks; no bare `apiClient` in page files ✓
- [x] Form-heavy surface uses `FormSheet` (not dialog) ✓
- [x] 5 UI states: loading skeleton, empty with CTA, error with retry, success, pagination ✓
- [x] Confirm before delete ✓
- [x] Jest tests: 4 described blocks covering owner post, non-owner reject, enrolled read, non-enrolled reject ✓

### Placeholder scan
No TBD/TODO/placeholder steps remain. All code blocks are complete.

### Type consistency
- `CourseAnnouncementWithCourse` (frontend types) is the return type for `listMine`; it includes `courseTitle` matching the service's select projection.
- `useMyAnnouncements` returns `AnnouncementsListResponse` which wraps `CourseAnnouncementWithCourse[]`.
- The page passes `CourseAnnouncementWithCourse` to `AnnouncementFormSheet` prop `announcement`.
- Service `listMine` selects `courseTitle: courses.title` — consistent with the frontend type.
- `create` service method receives `caller.userId` as `instructorId` in the insert — matches schema column `instructor_id`.
- All method names consistent across service → controller → hooks.
