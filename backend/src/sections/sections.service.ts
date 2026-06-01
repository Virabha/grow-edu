import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { eq, asc, and, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { courseSections, lessons, courses } from '../database/schema';
import { CreateSectionDto, UpdateSectionDto, ReorderSectionsDto } from './dto/section.dto';

@Injectable()
export class SectionsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(dto: CreateSectionDto, userId: string, userRole: string) {
    const course = await this.db.query.courses.findFirst({
      where: eq(courses.courseId, dto.courseId),
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== 'PLATFORM_ADMIN' && course.instructorId !== userId) {
      throw new ForbiddenException('Only the course owner or a platform admin can add sections');
    }

    const coursePrice = Number(course.price || 0);
    if (
      dto.sectionPrice !== undefined &&
      coursePrice > 0 &&
      dto.sectionPrice > coursePrice
    ) {
      throw new BadRequestException('Section price cannot exceed course price');
    }

    const [newModule] = await this.db
      .insert(courseSections)
      .values({
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        order: dto.order,
        priceType: dto.priceType || 'INCLUDED',
        sectionPrice: dto.sectionPrice !== undefined ? String(dto.sectionPrice) : null,
      })
      .returning();
    return newModule;
  }

  async update(sectionId: string, dto: UpdateSectionDto, userId: string, userRole: string) {
    const section = await this.db.query.courseSections.findFirst({
      where: eq(courseSections.sectionId, sectionId),
      with: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    if (userRole !== 'PLATFORM_ADMIN' && section.course.instructorId !== userId) {
      throw new ForbiddenException('Only the course owner or a platform admin can update sections');
    }

    if (dto.sectionPrice !== undefined && dto.sectionPrice !== null) {
      const coursePrice = Number(section.course.price || 0);
      if (coursePrice > 0 && dto.sectionPrice > coursePrice) {
        throw new BadRequestException('Section price cannot exceed course price');
      }
    }

    const [updatedModule] = await this.db
      .update(courseSections)
      .set({
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description ? { description: dto.description } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.priceType ? { priceType: dto.priceType } : {}),
        ...(dto.sectionPrice !== undefined
          ? { sectionPrice: dto.sectionPrice === null ? null : String(dto.sectionPrice) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(courseSections.sectionId, sectionId))
      .returning();

    if (!updatedModule) {
      throw new NotFoundException('Section not found');
    }

    return updatedModule;
  }

  async delete(sectionId: string, _courseId: string, userId: string, userRole: string) {
    const section = await this.db.query.courseSections.findFirst({
      where: eq(courseSections.sectionId, sectionId),
      with: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    if (userRole !== 'PLATFORM_ADMIN' && section.course.instructorId !== userId) {
      throw new ForbiddenException('Only the course owner or a platform admin can delete sections');
    }

    const [updated] = await this.db
      .update(courseSections)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(courseSections.sectionId, sectionId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Section not found');
    }
    return { success: true };
  }

  async getAll(courseId: string) {
    return this.db.query.courseSections.findMany({
      where: and(eq(courseSections.courseId, courseId), eq(courseSections.isDeleted, false)),
      orderBy: asc(courseSections.order),
      with: {
        lessons: {
          orderBy: asc(lessons.order)
        }
      }
    });
  }

  async reorder(dto: ReorderSectionsDto, userId: string, userRole: string) {
    if (userRole !== 'PLATFORM_ADMIN' && dto.modules.length > 0) {
      // Verify actual section ownership — don't trust the client-supplied courseId alone,
      // since an attacker could pass their own courseId while submitting another course's sectionIds.
      const sectionIds = dto.modules.map(m => m.sectionId);
      const [sectionRecord] = await this.db
        .select({ courseId: courseSections.courseId })
        .from(courseSections)
        .where(inArray(courseSections.sectionId, sectionIds))
        .limit(1);

      if (!sectionRecord) {
        throw new NotFoundException('Sections not found');
      }

      const course = await this.db.query.courses.findFirst({
        where: eq(courses.courseId, sectionRecord.courseId),
      });

      if (!course || course.instructorId !== userId) {
        throw new ForbiddenException('Only the course owner or a platform admin can reorder sections');
      }
    }

    const { modules } = dto;
    await this.db.transaction(async (tx) => {
      await Promise.all(
        modules.map((module) =>
          tx
            .update(courseSections)
            .set({ order: module.order })
            .where(eq(courseSections.sectionId, module.sectionId)),
        ),
      );
    });
    return { success: true };
  }
}
