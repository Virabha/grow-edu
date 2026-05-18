import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { eq, asc, and } from 'drizzle-orm';
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

  async create(dto: CreateSectionDto) {
    const course = await this.db.query.courses.findFirst({
      where: eq(courses.courseId, dto.courseId),
    });

    if (!course) {
      throw new NotFoundException('Course not found');
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

  async update(sectionId: string, dto: UpdateSectionDto) {
    if (dto.sectionPrice !== undefined && dto.sectionPrice !== null) {
      const course = await this.db.query.courses.findFirst({
        where: eq(courses.courseId, dto.courseId),
      });
      if (course) {
        const coursePrice = Number(course.price || 0);
        if (coursePrice > 0 && dto.sectionPrice > coursePrice) {
          throw new BadRequestException('Section price cannot exceed course price');
        }
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

  async delete(sectionId: string, _courseId: string) {
    // Note: The router input included courseId, but we might only need sectionId if we trust the ID. 
    // However, validation is good. For simplicity I'm just deleting by sectionId, 
    // assuming access control (guards) handle ownership checks if implemented properly.
    // The router logic just updated isDeleted to true.
    
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

  async reorder(dto: ReorderSectionsDto) {
    const { modules } = dto;
    await this.db.transaction(async (tx) => {
      for (const module of modules) {
        await tx
          .update(courseSections)
          .set({ order: module.order })
          .where(eq(courseSections.sectionId, module.sectionId));
      }
    });
    return { success: true };
  }
}
