import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { eq, desc, ilike, and, or, sql } from 'drizzle-orm';
import { teacherApplications, users, instructorProfiles } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import * as bcrypt from 'bcrypt';
import { CreateTeacherApplicationDto } from './dto/create-teacher-application.dto';
import { TeacherApplicationStatus } from './dto/update-status.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class TeacherApplicationsService {
  private readonly logger = new Logger(TeacherApplicationsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateTeacherApplicationDto) {
    const [row] = await this.db
      .insert(teacherApplications)
      .values({
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone ?? null,
        experienceYears: dto.experienceYears ?? null,
        skills: dto.skills ?? null,
        categories: dto.categories ?? null,
        cvUrl: dto.cvUrl ?? null,
        whyJoin: dto.whyJoin ?? null,
        status: 'PENDING',
      })
      .returning();
    return row;
  }

  async findAllAdmin(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const limit = Math.min(filters?.limit ?? 50, 100);
    const page = filters?.page ?? 1;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(teacherApplications.status, filters.status as 'PENDING' | 'APPROVED' | 'REJECTED'));
    }
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(teacherApplications.fullName, term),
          ilike(teacherApplications.email, term),
        ),
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(teacherApplications)
        .where(whereClause)
        .orderBy(desc(teacherApplications.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(teacherApplications)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select()
      .from(teacherApplications)
      .where(eq(teacherApplications.applicationId, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Application ${id} not found`);
    return row;
  }

  async updateStatus(id: string, status: TeacherApplicationStatus) {
    const application = await this.findOne(id);
    const previousStatus = application.status;

    const [row] = await this.db
      .update(teacherApplications)
      .set({ status, updatedAt: new Date() })
      .where(eq(teacherApplications.applicationId, id))
      .returning();

    if (status === 'APPROVED' && previousStatus !== 'APPROVED') {
      await this.grantInstructorAccess(application);
    }

    return row;
  }

  private async grantInstructorAccess(application: {
    email: string;
    fullName: string;
    skills: string[] | null;
    experienceYears: number | null;
  }) {
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, application.email))
      .limit(1);

    const nameParts = application.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? null;
    const lastName = nameParts.slice(1).join(' ') || null;

    let userId: string;
    let oldRole = 'LEARNER';

    if (existingUser) {
      userId = existingUser.userId;
      oldRole = existingUser.role;
      if (existingUser.role !== 'INSTRUCTOR' && existingUser.role !== 'PLATFORM_ADMIN') {
        await this.db
          .update(users)
          .set({ role: 'INSTRUCTOR', updatedAt: new Date() })
          .where(eq(users.userId, userId));
      }
    } else {
      // Auto-provision: create user with INSTRUCTOR role and random password.
      // They must use "forgot password" to set their own password.
      const tempPassword = await bcrypt.hash(
        crypto.randomUUID() + Date.now().toString(),
        10,
      );
      const [created] = await this.db
        .insert(users)
        .values({
          email: application.email,
          password: tempPassword,
          firstName,
          lastName,
          role: 'INSTRUCTOR',
          emailVerified: true,
        })
        .returning({ userId: users.userId });
      userId = created.userId;
    }

    // Create instructor profile if missing
    const [existingProfile] = await this.db
      .select()
      .from(instructorProfiles)
      .where(eq(instructorProfiles.userId, userId))
      .limit(1);

    if (!existingProfile) {
      await this.db.insert(instructorProfiles).values({
        userId,
        expertise: application.skills ?? null,
        experience: application.experienceYears
          ? `${application.experienceYears} years`
          : null,
        isActive: true,
      });
    }

    // Notify the new instructor
    try {
      await this.emailService.sendRoleChangeEmail({
        firstName,
        email: application.email,
        oldRole,
        newRole: 'INSTRUCTOR',
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send instructor role-change email to ${application.email}: ${(err as Error).message}`,
      );
    }
  }
}
