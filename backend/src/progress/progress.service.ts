import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { courseProgress, lessonProgress, courses, lessons, enrollments, sectionAccess } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ProgressService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getCourseProgress(courseId: string, userId: string, role?: string) {
    const [progress] = await this.db
      .select()
      .from(courseProgress)
      .where(and(eq(courseProgress.courseId, courseId), eq(courseProgress.userId, userId)))
      .limit(1);

    // Verify enrollment or access (skip for admins)
    if (role !== 'PLATFORM_ADMIN') {
      // Check for ACTIVE or COMPLETED enrollment only (exclude REVOKED)
      const [enrollment] = await this.db
        .select({ id: enrollments.enrollmentId })
        .from(enrollments)
        .where(and(
          eq(enrollments.courseId, courseId),
          eq(enrollments.userId, userId),
          inArray(enrollments.status, ['ACTIVE', 'COMPLETED'])
        ))
        .limit(1);

      if (!enrollment) {
        const [sectionGrant] = await this.db
          .select({ id: sectionAccess.sectionAccessId })
          .from(sectionAccess)
          .where(and(eq(sectionAccess.courseId, courseId), eq(sectionAccess.userId, userId)))
          .limit(1);

        if (!sectionGrant) {
          throw new ForbiddenException('Access denied to course content');
        }
      }
    }

    if (!progress) {
      // Create initial progress
      const [newProgress] = await this.db
        .insert(courseProgress)
        .values({
          userId,
          courseId,
          progress: '0',
          timeSpent: 0,
        })
        .returning();

      return {
        ...newProgress,
        lessonProgress: [],
      };
    }

    // Get lesson progress
    const lessonProgressData = await this.db
      .select()
      .from(lessonProgress)
      .where(eq(lessonProgress.progressId, progress.courseProgressId));

    return {
      ...progress,
      lessonProgress: lessonProgressData,
    };
  }

  async updateProgress(courseId: string, userId: string, dto: UpdateProgressDto, role?: string) {
    // Verify course exists
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.courseId, courseId))
      .limit(1);

    // Verify enrollment or access (skip for admins)
    if (role !== 'PLATFORM_ADMIN') {
      // Check for ACTIVE or COMPLETED enrollment only (exclude REVOKED)
      const [enrollment] = await this.db
        .select({ id: enrollments.enrollmentId })
        .from(enrollments)
        .where(and(
          eq(enrollments.courseId, courseId),
          eq(enrollments.userId, userId),
          inArray(enrollments.status, ['ACTIVE', 'COMPLETED'])
        ))
        .limit(1);

      if (!enrollment) {
        const [sectionGrant] = await this.db
          .select({ id: sectionAccess.sectionAccessId })
          .from(sectionAccess)
          .where(and(eq(sectionAccess.courseId, courseId), eq(sectionAccess.userId, userId)))
          .limit(1);

        if (!sectionGrant) {
          throw new ForbiddenException('Access denied to course content');
        }
      }
    }

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Get or create progress
    let [progress] = await this.db
      .select()
      .from(courseProgress)
      .where(and(eq(courseProgress.courseId, courseId), eq(courseProgress.userId, userId)))
      .limit(1);

    if (!progress) {
      [progress] = await this.db
        .insert(courseProgress)
        .values({
          userId,
          courseId,
          progress: '0',
          timeSpent: 0,
        })
        .returning();
    }

    // Update lesson progress if provided
    if (dto.lessonId) {
      const [lesson] = await this.db
        .select()
        .from(lessons)
        .where(eq(lessons.lessonId, dto.lessonId))
        .limit(1);

      if (!lesson) {
        throw new NotFoundException(`Lesson with ID ${dto.lessonId} not found`);
      }

      const [existingLessonProgress] = await this.db
        .select()
        .from(lessonProgress)
        .where(and(eq(lessonProgress.progressId, progress.courseProgressId), eq(lessonProgress.lessonId, dto.lessonId)))
        .limit(1);

      const lessonDuration = lesson.duration || 0;
      const lastPosition = dto.lastPosition ?? existingLessonProgress?.lastPosition ?? 0;
      const shouldComplete = !existingLessonProgress?.completed && lessonDuration > 0 && lastPosition >= lessonDuration * 0.9;

      if (existingLessonProgress) {
        await this.db
          .update(lessonProgress)
          .set({
            completed: shouldComplete || (dto.completed ?? existingLessonProgress.completed),
            timeSpent: (existingLessonProgress.timeSpent || 0) + (dto.timeSpent || 0),
            lastPosition: dto.lastPosition !== undefined ? dto.lastPosition : existingLessonProgress.lastPosition,
            lastAccessed: new Date(),
          })
          .where(eq(lessonProgress.lessonProgressId, existingLessonProgress.lessonProgressId));
      } else {
        await this.db.insert(lessonProgress).values({
          progressId: progress.courseProgressId,
          lessonId: dto.lessonId,
          completed: shouldComplete || (dto.completed || false),
          timeSpent: dto.timeSpent || 0,
          lastPosition: dto.lastPosition || null,
        });
      }
    }

    // Update course progress
    const totalTimeSpent = (progress.timeSpent || 0) + (dto.timeSpent || 0);
    const progressValue = dto.progress !== undefined ? String(dto.progress) : progress.progress;
    await this.db
      .update(courseProgress)
      .set({
        progress: progressValue,
        timeSpent: totalTimeSpent,
        lastAccessed: new Date(),
      })
      .where(eq(courseProgress.courseProgressId, progress.courseProgressId));

    return this.getCourseProgress(courseId, userId, role);
  }
}

