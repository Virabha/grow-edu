import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { eq, desc, ilike, and, or, sql } from 'drizzle-orm';
import { teacherApplications } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { CreateTeacherApplicationDto } from './dto/create-teacher-application.dto';
import { TeacherApplicationStatus } from './dto/update-status.dto';

@Injectable()
export class TeacherApplicationsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
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
    await this.findOne(id);
    const [row] = await this.db
      .update(teacherApplications)
      .set({ status, updatedAt: new Date() })
      .where(eq(teacherApplications.applicationId, id))
      .returning();
    return row;
  }
}
