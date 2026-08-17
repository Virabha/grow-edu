import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  courses,
  enrollments,
  liveSessionRegistrations,
  liveSessions,
} from '../database/schema';
import { MeetingCredentialsService } from '../instructor/meeting-credentials.service';
import { CreateLiveSessionDto, LiveProvider, LiveStatus } from './dto/create-live-session.dto';
import { FilterLiveSessionsDto } from './dto/filter-live-sessions.dto';
import { UpdateLiveSessionDto } from './dto/update-live-session.dto';

export const JOIN_WINDOW_MINUTES = 30;

type DbType = PostgresJsDatabase<typeof schema>;
type SessionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
type SessionPatch = Partial<typeof liveSessions.$inferInsert>;

export function resolveJoinUrl(
  joinUrl: string | null,
  status: string,
  startsAt: Date,
  isRegistered: boolean,
): string | null {
  if (!joinUrl) return null;
  if (status === 'LIVE') return joinUrl;
  if (!isRegistered) return null;
  const minutesUntilStart = (startsAt.getTime() - Date.now()) / 60000;
  return minutesUntilStart <= JOIN_WINDOW_MINUTES ? joinUrl : null;
}

function toDbStatus(status: LiveStatus | undefined, fallback: SessionStatus): SessionStatus {
  if (!status) return fallback;
  if (status === 'COMPLETED') return 'ENDED';
  return status as SessionStatus;
}

@Injectable()
export class LiveSessionsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    private readonly meetingCredentialsService: MeetingCredentialsService,
  ) {}

  async listSessions(userId: string, role: string, query: FilterLiveSessionsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 10), 100);
    const offset = (page - 1) * limit;

    const filters = [eq(liveSessions.isDeleted, false)];
    if (role !== 'PLATFORM_ADMIN') {
      filters.push(eq(liveSessions.instructorId, userId));
    }
    if (query.provider && query.provider !== 'all') {
      filters.push(eq(liveSessions.provider, query.provider as LiveProvider));
    }
    const where = and(...filters);

    const [countRow] = await this.db
      .select({ total: sql<number>`COUNT(${liveSessions.id})::int` })
      .from(liveSessions)
      .where(where);

    const total = countRow?.total ?? 0;

    if (total === 0) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const rows = await this.db
      .select({
        id: liveSessions.id,
        title: liveSessions.title,
        courseId: liveSessions.courseId,
        courseTitle: courses.title,
        instructorId: liveSessions.instructorId,
        provider: liveSessions.provider,
        joinUrl: liveSessions.joinUrl,
        meetingId: liveSessions.meetingId,
        meetingPasscode: liveSessions.meetingPasscode,
        startsAt: liveSessions.startsAt,
        durationMinutes: liveSessions.durationMinutes,
        status: liveSessions.status,
        description: liveSessions.description,
        createdAt: liveSessions.createdAt,
        updatedAt: liveSessions.updatedAt,
      })
      .from(liveSessions)
      .leftJoin(courses, eq(liveSessions.courseId, courses.courseId))
      .where(where)
      .orderBy(desc(liveSessions.startsAt))
      .limit(limit)
      .offset(offset);

    const sessionIds = rows.map((r) => r.id);
    const countRows = await this.db
      .select({
        sessionId: liveSessionRegistrations.sessionId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(liveSessionRegistrations)
      .where(inArray(liveSessionRegistrations.sessionId, sessionIds))
      .groupBy(liveSessionRegistrations.sessionId);

    const countMap = new Map(countRows.map((c) => [c.sessionId, c.count]));

    return {
      data: rows.map((row) => ({ ...row, registeredCount: countMap.get(row.id) ?? 0 })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createSession(instructorId: string, dto: CreateLiveSessionDto) {
    const startsAt = new Date(dto.startsAt);
    if (startsAt <= new Date()) {
      throw new BadRequestException('startsAt must be in the future');
    }

    let meetingId: string | null = dto.meetingId ?? null;

    if (!meetingId && (dto.provider === 'ZOOM' || dto.provider === 'JITSI')) {
      const creds = await this.meetingCredentialsService.getMeetingCredentials(instructorId);
      if (dto.provider === 'ZOOM' && creds.zoomClientId) {
        meetingId = creds.zoomClientId;
      } else if (dto.provider === 'JITSI' && creds.jitsiAppId) {
        meetingId = creds.jitsiAppId;
      }
    }

    const [row] = await this.db
      .insert(liveSessions)
      .values({
        instructorId,
        title: dto.title,
        description: dto.description ?? null,
        courseId: dto.courseId ?? null,
        provider: dto.provider,
        joinUrl: dto.joinUrl ?? null,
        meetingId,
        meetingPasscode: dto.meetingPasscode ?? null,
        startsAt,
        durationMinutes: dto.durationMinutes,
        status: toDbStatus(dto.status, 'SCHEDULED'),
      })
      .returning();

    return row;
  }

  async getSession(userId: string, role: string, sessionId: string) {
    const [row] = await this.db
      .select()
      .from(liveSessions)
      .where(and(eq(liveSessions.id, sessionId), eq(liveSessions.isDeleted, false)))
      .limit(1);

    if (!row) throw new NotFoundException('Session not found');
    if (role !== 'PLATFORM_ADMIN' && row.instructorId !== userId) {
      throw new ForbiddenException('You do not own this session');
    }

    return row;
  }

  async updateSession(
    userId: string,
    role: string,
    sessionId: string,
    dto: UpdateLiveSessionDto,
  ) {
    const existing = await this.getSession(userId, role, sessionId);

    const patch: SessionPatch = { updatedAt: new Date() };

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.courseId !== undefined) patch.courseId = dto.courseId;
    if (dto.provider !== undefined) patch.provider = dto.provider;
    if (dto.joinUrl !== undefined) patch.joinUrl = dto.joinUrl;
    if (dto.meetingId !== undefined) patch.meetingId = dto.meetingId;
    if (dto.meetingPasscode !== undefined) patch.meetingPasscode = dto.meetingPasscode;
    if (dto.durationMinutes !== undefined) {
      if (dto.durationMinutes < 1) {
        throw new BadRequestException('durationMinutes must be > 0');
      }
      patch.durationMinutes = dto.durationMinutes;
    }
    if (dto.startsAt !== undefined) {
      const newStart = new Date(dto.startsAt);
      if (existing.status === 'SCHEDULED' && newStart <= new Date()) {
        throw new BadRequestException('startsAt must be in the future for a SCHEDULED session');
      }
      patch.startsAt = newStart;
    }
    if (dto.status !== undefined) {
      patch.status = toDbStatus(dto.status, existing.status);
    }

    const [updated] = await this.db
      .update(liveSessions)
      .set(patch)
      .where(eq(liveSessions.id, sessionId))
      .returning();

    return updated;
  }

  async deleteSession(userId: string, role: string, sessionId: string) {
    await this.getSession(userId, role, sessionId);

    await this.db
      .update(liveSessions)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(liveSessions.id, sessionId));

    return { deleted: true };
  }

  async getUpcoming(userId: string) {
    const myEnrollments = await this.db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'ACTIVE')));

    if (myEnrollments.length === 0) return [];

    const enrolledCourseIds = myEnrollments.map((e) => e.courseId);

    const rows = await this.db
      .select({
        id: liveSessions.id,
        title: liveSessions.title,
        courseId: liveSessions.courseId,
        courseTitle: courses.title,
        provider: liveSessions.provider,
        joinUrl: liveSessions.joinUrl,
        startsAt: liveSessions.startsAt,
        durationMinutes: liveSessions.durationMinutes,
        status: liveSessions.status,
        description: liveSessions.description,
      })
      .from(liveSessions)
      .innerJoin(courses, eq(liveSessions.courseId, courses.courseId))
      .where(
        and(
          eq(liveSessions.isDeleted, false),
          sql`${liveSessions.status} IN ('SCHEDULED', 'LIVE')`,
          sql`${liveSessions.courseId} = ANY(${enrolledCourseIds})`,
        ),
      )
      .orderBy(asc(liveSessions.startsAt))
      .limit(50);

    if (rows.length === 0) return [];

    const sessionIds = rows.map((r) => r.id);

    const [myRegs, countRows] = await Promise.all([
      this.db
        .select({ sessionId: liveSessionRegistrations.sessionId })
        .from(liveSessionRegistrations)
        .where(
          and(
            inArray(liveSessionRegistrations.sessionId, sessionIds),
            eq(liveSessionRegistrations.userId, userId),
          ),
        ),
      this.db
        .select({
          sessionId: liveSessionRegistrations.sessionId,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(liveSessionRegistrations)
        .where(inArray(liveSessionRegistrations.sessionId, sessionIds))
        .groupBy(liveSessionRegistrations.sessionId),
    ]);

    const registeredSet = new Set(myRegs.map((r) => r.sessionId));
    const countMap = new Map(countRows.map((c) => [c.sessionId, c.count]));

    return rows.map((session) => ({
      ...session,
      isRegistered: registeredSet.has(session.id),
      registeredCount: countMap.get(session.id) ?? 0,
      joinUrl: resolveJoinUrl(
        session.joinUrl,
        session.status,
        session.startsAt,
        registeredSet.has(session.id),
      ),
    }));
  }

  async register(userId: string, sessionId: string) {
    const [session] = await this.db
      .select({ id: liveSessions.id, status: liveSessions.status })
      .from(liveSessions)
      .where(and(eq(liveSessions.id, sessionId), eq(liveSessions.isDeleted, false)))
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'ENDED' || session.status === 'CANCELLED') {
      throw new BadRequestException('Session is no longer accepting registrations');
    }

    const [existing] = await this.db
      .select()
      .from(liveSessionRegistrations)
      .where(
        and(
          eq(liveSessionRegistrations.sessionId, sessionId),
          eq(liveSessionRegistrations.userId, userId),
        ),
      )
      .limit(1);

    if (existing) return existing;

    const [row] = await this.db
      .insert(liveSessionRegistrations)
      .values({ sessionId, userId })
      .returning();

    return row;
  }

  async unregister(userId: string, sessionId: string) {
    await this.db
      .delete(liveSessionRegistrations)
      .where(
        and(
          eq(liveSessionRegistrations.sessionId, sessionId),
          eq(liveSessionRegistrations.userId, userId),
        ),
      );

    return { unregistered: true };
  }

  async getSessionForLearner(userId: string, sessionId: string) {
    const [row] = await this.db
      .select({
        id: liveSessions.id,
        title: liveSessions.title,
        courseId: liveSessions.courseId,
        courseTitle: courses.title,
        provider: liveSessions.provider,
        joinUrl: liveSessions.joinUrl,
        startsAt: liveSessions.startsAt,
        durationMinutes: liveSessions.durationMinutes,
        status: liveSessions.status,
        description: liveSessions.description,
      })
      .from(liveSessions)
      .leftJoin(courses, eq(liveSessions.courseId, courses.courseId))
      .where(and(eq(liveSessions.id, sessionId), eq(liveSessions.isDeleted, false)))
      .limit(1);

    if (!row) throw new NotFoundException('Session not found');

    const [reg] = await this.db
      .select({ id: liveSessionRegistrations.id })
      .from(liveSessionRegistrations)
      .where(
        and(
          eq(liveSessionRegistrations.sessionId, sessionId),
          eq(liveSessionRegistrations.userId, userId),
        ),
      )
      .limit(1);

    const isRegistered = !!reg;

    return {
      ...row,
      isRegistered,
      joinUrl: resolveJoinUrl(row.joinUrl, row.status, row.startsAt, isRegistered),
    };
  }
}
