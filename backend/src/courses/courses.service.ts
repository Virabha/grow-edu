import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { eq, and, or, like, desc, asc, sql, inArray } from "drizzle-orm";
import {
  courses,
  categories,
  users,
  courseSections,
  lessons,
  enrollments,
  sectionAccess,
} from "../database/schema";
import { DATABASE_CONNECTION } from "../database/database.module";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../database/schema";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { FilterCoursesDto, CourseStatus } from "./dto/filter-courses.dto";
import { FilesService } from "../files/files.service";
import { EmailService } from "../email/email.service";
import { CacheService } from "../cache/cache.service";

const MAX_PAGE_LIMIT = 50;
const PLATFORM_CURRENCY = "INR";
const COURSES_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class CoursesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly filesService: FilesService,
    private readonly emailService: EmailService,
    private readonly cacheService: CacheService,
  ) {}

  private ensureThumbnailUrl(thumbnail: string | null): string | null {
    if (!thumbnail) return null;
    if (thumbnail.startsWith("http")) return thumbnail;
    return this.filesService.getDownloadUrl(thumbnail);
  }

  private async invalidateCourseCache() {
    await this.cacheService.delByPrefix('courses:');
  }

  async findAll(filters?: FilterCoursesDto, userRole?: string) {
    // Cache public (non-admin/instructor) course listings
    const isPublicQuery = userRole !== "PLATFORM_ADMIN" && userRole !== "INSTRUCTOR";
    if (isPublicQuery) {
      const cacheKey = `courses:public:${JSON.stringify(filters || {})}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters?.categoryId) {
      // Check if the category has children — if so, include courses from all subcategories
      const children = await this.db
        .select({ categoryId: categories.categoryId })
        .from(categories)
        .where(and(eq(categories.parentCategoryId, filters.categoryId), eq(categories.isDeleted, false)));
      if (children.length > 0) {
        const allIds = [filters.categoryId, ...children.map((c) => c.categoryId)];
        conditions.push(inArray(courses.categoryId, allIds));
      } else {
        conditions.push(eq(courses.categoryId, filters.categoryId));
      }
    }
    if (filters?.instructorId) {
      conditions.push(eq(courses.instructorId, filters.instructorId));
    }
    if (filters?.status) {
      conditions.push(eq(courses.status, filters.status));
    } else if (userRole !== "PLATFORM_ADMIN" && userRole !== "INSTRUCTOR") {
      conditions.push(
        and(
          eq(courses.status, "PUBLISHED"),
          eq(courses.reviewStatus, "APPROVED")
        )
      );
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(courses.title, `%${filters.search}%`),
          like(courses.description, `%${filters.search}%`)
        )!
      );
    }
    if (filters?.level) {
      conditions.push(eq(courses.level, filters.level as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // If instructorId filter is provided, include sections and lessons
    const includeSections = !!filters?.instructorId;

    let data: any[];
    let total: any[];

    if (includeSections) {
      // Get paginated courses and count in parallel
      const [courseResults, countResult] = await Promise.all([
        this.db
          .select({
            courseId: courses.courseId,
            title: courses.title,
            slug: courses.slug,
            description: courses.description,
            thumbnail: courses.thumbnail,
            price: courses.price,
            compareAtPrice: courses.compareAtPrice,
            currency: courses.currency,
            status: courses.status,
            categoryId: courses.categoryId,
            instructorId: courses.instructorId,
            createdAt: courses.createdAt,
            updatedAt: courses.updatedAt,
            reviewStatus: courses.reviewStatus,
            submittedAt: courses.submittedAt,
          })
          .from(courses)
          .where(whereClause)
          .orderBy(desc(courses.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(courses)
          .where(whereClause),
      ]);

      total = countResult;
      const courseIdList = courseResults.map((c) => c.courseId);

      if (courseIdList.length === 0) {
        data = [];
      } else {
        // Batch fetch all related data in parallel (avoid N+1)
        const categoryIds = [...new Set(courseResults.map((c) => c.categoryId).filter(Boolean))] as string[];
        const instructorIds = [...new Set(courseResults.map((c) => c.instructorId).filter(Boolean))] as string[];

        // Guard against empty arrays for IN() queries
        const [categoryResults, instructorResults, sectionResults] = await Promise.all([
          categoryIds.length > 0
            ? this.db
                .select()
                .from(categories)
                .where(inArray(categories.categoryId, categoryIds))
            : Promise.resolve([]),
          instructorIds.length > 0
            ? this.db
                .select({
                  userId: users.userId,
                  email: users.email,
                  firstName: users.firstName,
                  lastName: users.lastName,
                })
                .from(users)
                .where(inArray(users.userId, instructorIds))
            : Promise.resolve([]),
          this.db
            .select()
            .from(courseSections)
            .where(
              and(
                inArray(courseSections.courseId, courseIdList),
                eq(courseSections.isDeleted, false)
              )
            )
            .orderBy(asc(courseSections.order)),
        ]);

        const sectionIds = sectionResults.map((s) => s.sectionId);
        const lessonResults =
          sectionIds.length > 0
            ? await this.db
                .select()
                .from(lessons)
                .where(inArray(lessons.sectionId, sectionIds))
                .orderBy(asc(lessons.order))
            : [];

        // Build lookup maps
        const categoryMap = new Map(categoryResults.map((c) => [c.categoryId, c]));
        const instructorMap = new Map(instructorResults.map((i) => [i.userId, i]));
        const lessonsBySectionId = new Map<string, any[]>();
        for (const lesson of lessonResults) {
          if (!lessonsBySectionId.has(lesson.sectionId)) {
            lessonsBySectionId.set(lesson.sectionId, []);
          }
          lessonsBySectionId.get(lesson.sectionId)!.push(lesson);
        }

        // Group sections by course and attach lessons
        const sectionsByCourseId = new Map<string, any[]>();
        for (const section of sectionResults) {
          if (!sectionsByCourseId.has(section.courseId)) {
            sectionsByCourseId.set(section.courseId, []);
          }
          sectionsByCourseId.get(section.courseId)!.push({
            ...section,
            lessons: lessonsBySectionId.get(section.sectionId) || [],
          });
        }

        // Assemble final course objects with signed URLs
        data = courseResults.map((course) => ({
            ...course,
            category: categoryMap.get(course.categoryId!) || null,
            instructor: instructorMap.get(course.instructorId!) || null,
            sections: sectionsByCourseId.get(course.courseId) || [],
            thumbnail: this.ensureThumbnailUrl(course.thumbnail),
          }));
      }
    } else {
      // Use select for better performance when sections not needed
      [data, total] = await Promise.all([
        this.db
          .select({
            courseId: courses.courseId,
            title: courses.title,
            slug: courses.slug,
            description: courses.description,
            thumbnail: courses.thumbnail,
            price: courses.price,
            compareAtPrice: courses.compareAtPrice,
            currency: courses.currency,
            status: courses.status,
            categoryId: courses.categoryId,
            instructorId: courses.instructorId,
            createdAt: courses.createdAt,
            updatedAt: courses.updatedAt,
            reviewStatus: courses.reviewStatus,
            submittedAt: courses.submittedAt,
            category: {
              id: categories.categoryId,
              name: categories.name,
              slug: categories.slug,
              description: categories.description,
            },
            instructor: {
              id: users.userId,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
            },
          })
          .from(courses)
          .leftJoin(categories, eq(courses.categoryId, categories.categoryId))
          .leftJoin(users, eq(courses.instructorId, users.userId))
          .where(whereClause)
          .orderBy(desc(courses.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(courses)
          .where(whereClause),
      ]);

      // Sign URLs for all courses
      data = data.map((course) => ({
          ...course,
          thumbnail: this.ensureThumbnailUrl(course.thumbnail),
        }));
    }

    const totalCount = Number(total[0]?.count || 0);
    const result = {
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    if (isPublicQuery) {
      const cacheKey = `courses:public:${JSON.stringify(filters || {})}`;
      await this.cacheService.set(cacheKey, result, COURSES_CACHE_TTL);
    }

    return result;
  }

  async findOne(
    id: string,
    userId?: string,
    userRole?: string,
    options?: { includeLessons?: boolean; includeQuestions?: boolean }
  ) {
    // Backwards-compatible defaults: preserve current API shape unless caller opts out.
    const includeLessons = options?.includeLessons ?? true;
    const includeQuestions = options?.includeQuestions ?? true;

    // Build the query with conditional depth
    let courseQuery: any;

    if (includeLessons && includeQuestions) {
      // Full depth - lessons with questions
      courseQuery = await this.db.query.courses.findFirst({
        where: or(eq(courses.courseId, id), eq(courses.slug, id)),
        with: {
          category: true,
          instructor: true,
          sections: {
            orderBy: (sections: any) => [asc(sections.order)],
            with: {
              lessons: {
                orderBy: (lessons: any) => [asc(lessons.order)],
                with: {
                  questions: {
                    orderBy: (questions: any) => [asc(questions.order)],
                  },
                },
              },
            },
          },
        },
      });
    } else if (includeLessons) {
      // Medium depth - lessons without questions
      courseQuery = await this.db.query.courses.findFirst({
        where: or(eq(courses.courseId, id), eq(courses.slug, id)),
        with: {
          category: true,
          instructor: true,
          sections: {
            orderBy: (sections: any) => [asc(sections.order)],
            with: {
              lessons: {
                orderBy: (lessons: any) => [asc(lessons.order)],
              },
            },
          },
        },
      });
    } else {
      // Shallow depth - only sections, no lessons or questions
      courseQuery = await this.db.query.courses.findFirst({
        where: or(eq(courses.courseId, id), eq(courses.slug, id)),
        with: {
          category: true,
          instructor: true,
          sections: {
            orderBy: (sections: any) => [asc(sections.order)],
          },
        },
      });
    }

    const course = courseQuery;

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    let accessibleSectionIds: string[] = [];

    if (userId) {
      accessibleSectionIds = await this.getAccessibleSectionIds(course.courseId, userId, userRole);
    }

    return {
      ...course,
      thumbnail: this.ensureThumbnailUrl(course.thumbnail),
      accessibleSectionIds,
    };
  }

  async getAccessibleSectionIds(courseId: string, userId: string, userRole?: string): Promise<string[]> {
    if (userRole === 'PLATFORM_ADMIN' || userRole === 'INSTRUCTOR') {
      const allSections = await this.db
        .select({ sectionId: courseSections.sectionId })
        .from(courseSections)
        .where(eq(courseSections.courseId, courseId));
      return allSections.map(s => s.sectionId);
    }

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

    if (enrollment) {
      const allSections = await this.db
        .select({ sectionId: courseSections.sectionId })
        .from(courseSections)
        .where(eq(courseSections.courseId, courseId));
      return allSections.map(s => s.sectionId);
    }

    const sectionAccessList = await this.db
      .select({ sectionId: sectionAccess.sectionId })
      .from(sectionAccess)
      .where(and(eq(sectionAccess.courseId, courseId), eq(sectionAccess.userId, userId)));

    return sectionAccessList.map(s => s.sectionId);
  }

  async findBySlug(slug: string) {
    const [course] = await this.db
      .select({
        courseId: courses.courseId,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        thumbnail: courses.thumbnail,
        price: courses.price,
        currency: courses.currency,
        status: courses.status,
        categoryId: courses.categoryId,
        instructorId: courses.instructorId,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        category: {
          id: categories.categoryId,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
        },
        instructor: {
          id: users.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(courses)
      .leftJoin(categories, eq(courses.categoryId, categories.categoryId))
      .leftJoin(users, eq(courses.instructorId, users.userId))
      .where(eq(courses.slug, slug))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Course with slug ${slug} not found`);
    }

    // Transform keys for consistency with findOne result structure if needed,
    // or just return signed thumbnail
    return {
      ...course,
      thumbnail: this.ensureThumbnailUrl(course.thumbnail),
    };
  }

  async create(dto: CreateCourseDto, instructorId: string) {
    const compareAtPrice =
      dto.compareAtPrice !== undefined && dto.compareAtPrice !== null
        ? Number(dto.compareAtPrice)
        : null;
    const price = Number(dto.price);
    if (compareAtPrice !== null && compareAtPrice < price) {
      throw new BadRequestException(
        "Compare-at price must be greater than or equal to the course price"
      );
    }

    const [course] = await this.db
      .insert(courses)
      .values({
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        thumbnail: dto.thumbnail ? this.filesService.extractKey(dto.thumbnail) : null,
        price: String(price),
        compareAtPrice: compareAtPrice !== null ? String(compareAtPrice) : null,
        currency: PLATFORM_CURRENCY,
        status: dto.status || "DRAFT",
        categoryId: dto.categoryId,
        instructorId,
      })
      .returning({ courseId: courses.courseId });

    await this.invalidateCourseCache();
    return this.findOne(course.courseId);
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
    userId: string,
    userRole: string
  ) {
    const course = await this.findOne(id);

    // Only instructor or admin can update
    if (userRole !== "PLATFORM_ADMIN" && course.instructorId !== userId) {
      throw new ForbiddenException("You can only update your own courses");
    }

    const effectivePrice =
      dto.price !== undefined ? Number(dto.price) : Number(course.price);
    const effectiveCompareAt =
      dto.compareAtPrice !== undefined && dto.compareAtPrice !== null
        ? Number(dto.compareAtPrice)
        : null;

    if (effectiveCompareAt !== null && effectiveCompareAt < effectivePrice) {
      throw new BadRequestException(
        "Compare-at price must be greater than or equal to the course price"
      );
    }

    if (dto.price !== undefined) {
      const newCoursePrice = Number(dto.price);
      if (newCoursePrice > 0) {
        const sections = await this.db
          .select()
          .from(courseSections)
          .where(and(
            eq(courseSections.courseId, course.courseId),
            eq(courseSections.isDeleted, false)
          ));

        for (const section of sections) {
          if (
            section.sectionPrice &&
            Number(section.sectionPrice) > newCoursePrice
          ) {
            throw new BadRequestException(
              `Cannot update course price: Section "${section.title}" price (${section.sectionPrice}) exceeds the new course price (${newCoursePrice}). Please adjust section prices first.`
            );
          }
        }
      }
    }

    const updateData: {
      title?: string;
      slug?: string;
      description?: string;
      thumbnail?: string | null;
      price?: string;
      compareAtPrice?: string | null;
      currency?: string;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      categoryId?: string;
      learningOutcomes?: string[];
      targetAudience?: string[];
      requirements?: string[];
      updatedAt?: Date;
    } = {
      updatedAt: new Date(),
    };
    if (dto.title) updateData.title = dto.title;
    if (dto.slug) updateData.slug = dto.slug;
    if (dto.description) updateData.description = dto.description;
    if (dto.thumbnail !== undefined) {
      updateData.thumbnail = dto.thumbnail
        ? this.filesService.extractKey(dto.thumbnail)
        : dto.thumbnail;
    }
    if (dto.price !== undefined) updateData.price = String(dto.price);
    if (dto.compareAtPrice !== undefined) {
      updateData.compareAtPrice =
        dto.compareAtPrice === null ? null : String(dto.compareAtPrice);
    }
    if (dto.currency) {
      updateData.currency = PLATFORM_CURRENCY;
    }
    if (dto.status) updateData.status = dto.status;
    if (dto.categoryId) updateData.categoryId = dto.categoryId;
    if (dto.learningOutcomes !== undefined) updateData.learningOutcomes = dto.learningOutcomes;
    if (dto.targetAudience !== undefined) updateData.targetAudience = dto.targetAudience;
    if (dto.requirements !== undefined) updateData.requirements = dto.requirements;

    const [updated] = await this.db
      .update(courses)
      .set(updateData)
      .where(eq(courses.courseId, course.courseId))
      .returning({ courseId: courses.courseId });

    await this.invalidateCourseCache();
    return this.findOne(updated.courseId);
  }

  async delete(id: string, userId: string, userRole: string) {
    const course = await this.findOne(id);

    // Only instructor or admin can delete
    if (userRole !== "PLATFORM_ADMIN" && course.instructorId !== userId) {
      throw new ForbiddenException("You can only delete your own courses");
    }

    await this.db.delete(courses).where(eq(courses.courseId, course.courseId));

    await this.invalidateCourseCache();
    return { message: "Course deleted successfully" };
  }

  async submitForReview(id: string, userId: string, userRole: string) {
    const course = await this.db.query.courses.findFirst({
      where: or(eq(courses.courseId, id), eq(courses.slug, id)),
      with: {
        sections: {
          where: eq(courseSections.isDeleted, false),
          with: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    if (userRole !== "PLATFORM_ADMIN" && course.instructorId !== userId) {
      throw new ForbiddenException("You can only submit your own course");
    }

    const activeSections = course.sections || [];
    if (activeSections.length === 0) {
      throw new BadRequestException(
        "Add at least one section before submitting"
      );
    }

    const hasLesson = activeSections.some(
      (section) => (section.lessons?.length || 0) > 0
    );
    if (!hasLesson) {
      throw new BadRequestException(
        "Add at least one lesson or quiz before submitting"
      );
    }

    const coursePrice = Number(course.price || 0);
    for (const section of activeSections) {
      if (
        (section.priceType === "INDIVIDUAL" || section.priceType === "BOTH") &&
        !section.sectionPrice
      ) {
        throw new BadRequestException(
          `Section "${section.title}" requires a price when individually purchasable.`
        );
      }
      if (
        section.sectionPrice &&
        coursePrice > 0 &&
        Number(section.sectionPrice) > coursePrice
      ) {
        throw new BadRequestException(
          `Section "${section.title}" price cannot exceed course price.`
        );
      }
    }

    const [updated] = await this.db
      .update(courses)
      .set({
        reviewStatus: "PENDING_REVIEW",
        status: "DRAFT",
        submittedAt: new Date(),
        reviewedAt: null,
        rejectionReason: null,
        reviewNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(courses.courseId, course.courseId))
      .returning();

    await this.invalidateCourseCache();
    return updated;
  }

  async approve(
    id: string,
    userId: string,
    userRole: string,
    notes?: string,
    publish: boolean = true
  ) {
    // Ensure course exists and we have permissions
    const course = await this.findOne(id);
    
    if (userRole !== "PLATFORM_ADMIN") {
      throw new ForbiddenException("Only admins can approve");
    }

    const [updated] = await this.db
      .update(courses)
      .set({
        reviewStatus: "APPROVED",
        status: publish === false ? "DRAFT" : "PUBLISHED",
        reviewNotes: notes || null,
        rejectionReason: null,
        reviewedAt: new Date(),
        publishedAt: publish === false ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(courses.courseId, course.courseId))
      .returning();

    if (!updated) {
      throw new NotFoundException("Course not found");
    }

    // Send approval email to instructor
    try {
      const instructor = await this.db.query.users.findFirst({
        where: eq(users.userId, course.instructorId),
      });

      if (instructor) {
        await this.emailService.sendCourseApprovedEmail({
          firstName: instructor.firstName,
          email: instructor.email,
          courseId: course.courseId,
          courseTitle: course.title,
          reviewNotes: notes || null,
          publish: publish,
        });
      }
    } catch {}

    await this.invalidateCourseCache();
    return updated;
  }

  async requestChanges(
    id: string,
    userId: string,
    userRole: string,
    notes?: string
  ) {
    const course = await this.findOne(id);
    
    if (userRole !== "PLATFORM_ADMIN") {
      throw new ForbiddenException("Only admins can request changes");
    }

    const [updated] = await this.db
      .update(courses)
      .set({
        reviewStatus: "CHANGES_REQUESTED",
        status: "DRAFT",
        reviewNotes: notes || null,
        reviewedAt: new Date(),
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(courses.courseId, course.courseId))
      .returning();

    if (!updated) {
      throw new NotFoundException("Course not found");
    }

    // Send changes requested email to instructor
    try {
      const instructor = await this.db.query.users.findFirst({
        where: eq(users.userId, course.instructorId),
      });

      if (instructor && notes) {
        await this.emailService.sendCourseChangesRequestedEmail({
          firstName: instructor.firstName,
          email: instructor.email,
          courseId: course.courseId,
          courseTitle: course.title,
          reviewNotes: notes,
        });
      }
    } catch {}

    await this.invalidateCourseCache();
    return updated;
  }

  async reject(id: string, userId: string, userRole: string, reason: string) {
    const course = await this.findOne(id);
    
    if (userRole !== "PLATFORM_ADMIN") {
      throw new ForbiddenException("Only admins can reject");
    }

    const [updated] = await this.db
      .update(courses)
      .set({
        reviewStatus: "REJECTED",
        status: "DRAFT",
        rejectionReason: reason,
        reviewNotes: null,
        reviewedAt: new Date(),
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(courses.courseId, course.courseId))
      .returning();

    if (!updated) {
      throw new NotFoundException("Course not found");
    }

    // Send rejection email to instructor
    try {
      const instructor = await this.db.query.users.findFirst({
        where: eq(users.userId, course.instructorId),
      });

      if (instructor) {
        await this.emailService.sendCourseRejectedEmail({
          firstName: instructor.firstName,
          email: instructor.email,
          courseId: course.courseId,
          courseTitle: course.title,
          rejectionReason: reason,
        });
      }
    } catch {}

    await this.invalidateCourseCache();
    return updated;
  }

  async unpublish(id: string, userId: string, userRole: string) {
    if (userRole !== "PLATFORM_ADMIN") {
      throw new ForbiddenException("Only admins can unpublish");
    }

    const [course] = await this.db
      .update(courses)
      .set({
        status: "ARCHIVED",
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(courses.courseId, id))
      .returning();

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    await this.invalidateCourseCache();
    return course;
  }
}
