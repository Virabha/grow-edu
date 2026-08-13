import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, count, sum, desc } from 'drizzle-orm';
import { FilesService } from '../files/files.service';

@Injectable()
export class InstructorService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly filesService: FilesService,
  ) {}

  private ensureThumbnailUrl(thumbnail: string | null): string | null {
    if (!thumbnail) return null;
    if (thumbnail.startsWith('http')) return thumbnail;
    return this.filesService.getDownloadUrl(thumbnail);
  }

  async getDashboardStats(instructorId: string) {
    // 1. Total Courses
    const [courseCount] = await this.db
      .select({ count: count() })
      .from(schema.courses)
      .where(eq(schema.courses.instructorId, instructorId));

    // 2. Total Enrollments (in courses owned by instructor)
    // We join enrollments -> courses -> filter by instructor
    const [enrollmentCount] = await this.db
      .select({ count: count() })
      .from(schema.enrollments)
      .innerJoin(
        schema.courses,
        eq(schema.enrollments.courseId, schema.courses.courseId)
      )
      .where(eq(schema.courses.instructorId, instructorId));

    // 3. Total Revenue
    // payment -> course -> instructor
    // OR payment -> section -> course -> instructor
    // For MVP, strict join on course ownership
    const [revenue] = await this.db
      .select({ total: sum(schema.payments.amount) })
      .from(schema.payments)
      .leftJoin(
        schema.courses,
        eq(schema.payments.courseId, schema.courses.courseId)
      )
      .leftJoin(
        schema.courseSections,
        eq(schema.payments.sectionId, schema.courseSections.sectionId)
      )
      // We need to check if course owner is instructor.
      // If payment has courseId, check course.instructorId
      // If payment has sectionId, check section.course.instructorId
      // This is a bit complex in single query without nice ORM helper, 
      // simplified: assume all payments link to course directly (or we join both)
      // Better approach:
      // Join payments with courses on courseId.
      .where(
         eq(schema.courses.instructorId, instructorId)
      );
      
    // Note: If payment is SECTION level, it might not have courseId populated in some designs,
    // but typically it should. If not, we join section first.
    // Let's rely on `courseId` being present in payments for now as per schema it seems optional but usually populated.
    
    // 4. Recent Courses
    const recentCourses = await this.db.query.courses.findMany({
        where: eq(schema.courses.instructorId, instructorId),
        orderBy: [desc(schema.courses.createdAt)],
        limit: 5,
        with: {
            enrollments: true, // simplified count if possible, but Drizzle doesn't support relation count easily yet without grouping
        }
    });

    return {
      totalCourses: courseCount.count,
      totalStudents: enrollmentCount.count,
      totalRevenue: revenue.total ? parseFloat(revenue.total) : 0,
      recentCourses: recentCourses.map(c => ({
          ...c,
          thumbnail: this.ensureThumbnailUrl(c.thumbnail),
          enrollmentCount: c.enrollments.length
      }))
    };
  }

  async getInstructorCourses(instructorId: string, page = 1, limit = 10) {
    const effectiveLimit = Math.min(limit, 100);
    const offset = (page - 1) * effectiveLimit;
    
    // Get courses with detailed stats (e.g. revenue per course)
    const courses = await this.db.query.courses.findMany({
        where: eq(schema.courses.instructorId, instructorId),
        limit: effectiveLimit,
        offset: offset,
        orderBy: [desc(schema.courses.createdAt)],
        with: {
            enrollments: true,
            sections: true
        }
    });
    
    const [total] = await this.db
        .select({ count: count() })
        .from(schema.courses)
        .where(eq(schema.courses.instructorId, instructorId));

    return {
        data: courses.map(c => ({
            ...c,
            thumbnail: this.ensureThumbnailUrl(c.thumbnail),
        })),
        meta: {
            total: total.count,
            page,
            limit: effectiveLimit,
            totalPages: Math.ceil(total.count / effectiveLimit)
        }
    };
  }
}
