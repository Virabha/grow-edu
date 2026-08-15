import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { eq, and, or, ilike, desc, asc, sql, inArray } from "drizzle-orm";
import {
  enrollments,
  courses,
  users,
  companies,
  categories,
  sectionAccess,
  courseSections,
} from "../database/schema";
import { alias } from "drizzle-orm/pg-core";
import { DATABASE_CONNECTION } from "../database/database.module";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../database/schema";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { BulkEnrollmentDto } from "./dto/bulk-enrollment.dto";
import { EmailService } from "../email/email.service";
import { FilesService } from "../files/files.service";

const MAX_PAGE_LIMIT = 100;

@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private emailService: EmailService,
    private filesService: FilesService,
  ) {}

  private ensureThumbnailUrl(
    thumbnail: string | null | undefined,
  ): string | null {
    if (!thumbnail) return null;
    if (thumbnail.startsWith("http")) return thumbnail;
    return this.filesService.getDownloadUrl(thumbnail);
  }

  private resolveDisplayName(
    firstName: string | null,
    lastName: string | null,
    email: string | null,
  ): string {
    const name = [firstName, lastName].filter(Boolean).join(" ");
    return name || email || "";
  }

  async findAll(filters?: {
    userId?: string;
    courseId?: string;
    companyId?: string;
    status?: string;
    source?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 10, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    // Build conditions for enrollments query - including search in SQL
    const enrollmentConditions = [];
    if (filters?.userId) {
      enrollmentConditions.push(eq(enrollments.userId, filters.userId));
    }
    if (filters?.courseId) {
      enrollmentConditions.push(eq(enrollments.courseId, filters.courseId));
    }
    if (filters?.companyId) {
      enrollmentConditions.push(eq(enrollments.companyId, filters.companyId));
    }
    if (filters?.status) {
      enrollmentConditions.push(
        eq(
          enrollments.status,
          filters.status as "ACTIVE" | "COMPLETED" | "REVOKED",
        ),
      );
    }
    if (filters?.source) {
      enrollmentConditions.push(
        eq(
          enrollments.source,
          filters.source as "SELF_PURCHASE" | "ADMIN_GRANT" | "COMPANY_ASSIGNMENT" | "FREE_COURSE",
        ),
      );
    }
    // Move search to SQL with ILIKE
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(courses.title, searchPattern),
        ilike(users.firstName, searchPattern),
        ilike(users.lastName, searchPattern),
        ilike(users.email, searchPattern),
      );
      if (searchCondition) enrollmentConditions.push(searchCondition);
    }

    const enrollmentWhereClause =
      enrollmentConditions.length > 0
        ? and(...enrollmentConditions)
        : undefined;

    const grantedByUser = alias(users, 'granted_by_user');

    const [countResult, fullEnrollments] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .leftJoin(users, eq(enrollments.userId, users.userId))
        .leftJoin(courses, eq(enrollments.courseId, courses.courseId))
        .where(enrollmentWhereClause),
      this.db
        .select({
          enrollmentId: enrollments.enrollmentId,
          userId: enrollments.userId,
          courseId: enrollments.courseId,
          companyId: enrollments.companyId,
          status: enrollments.status,
          source: enrollments.source,
          grantedById: enrollments.grantedBy,
          enrolledAt: enrollments.enrolledAt,
          completedAt: enrollments.completedAt,
          userInfo: {
            id: users.userId,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          },
          courseInfo: {
            id: courses.courseId,
            title: courses.title,
            slug: courses.slug,
            description: courses.description,
            thumbnail: courses.thumbnail,
            price: courses.price,
            currency: courses.currency,
            categoryId: courses.categoryId,
            categoryName: sql<string>`${categories.name}`,
            categorySlug: categories.slug,
            categoryDescription: categories.description,
          },
          companyInfo: {
            id: companies.companyId,
            name: companies.name,
          },
          grantedByInfo: {
            id: grantedByUser.userId,
            firstName: grantedByUser.firstName,
            lastName: grantedByUser.lastName,
            email: grantedByUser.email,
          },
        })
        .from(enrollments)
        .leftJoin(users, eq(enrollments.userId, users.userId))
        .leftJoin(courses, eq(enrollments.courseId, courses.courseId))
        .leftJoin(categories, eq(courses.categoryId, categories.categoryId))
        .leftJoin(companies, eq(enrollments.companyId, companies.companyId))
        .leftJoin(grantedByUser, eq(enrollments.grantedBy, grantedByUser.userId))
        .where(enrollmentWhereClause)
        .orderBy(desc(enrollments.enrolledAt))
        .limit(limit)
        .offset(offset),
    ]);

    const fullEnrollmentCount = Number(countResult[0]?.count || 0);

    type EnrollmentUserInfo = { id: string | null; email: string | null; firstName: string | null; lastName: string | null };
    type EnrollmentCourseInfo = { id: string | null; title: string | null; slug: string | null; description: string | null; thumbnail: string | null; price: string | null; currency: string | null; categoryId: string | null; categoryName: string; categorySlug: string | null; categoryDescription: string | null };
    type GrantedByInfo = { id: string | null; firstName: string | null; lastName: string | null; email: string | null };
    type SectionAccessRecord = {
      enrollmentId: string;
      userId: string;
      courseId: string;
      companyId: null;
      status: "ACTIVE";
      source: "SELF_PURCHASE";
      grantedById: null;
      grantedByInfo: null;
      enrolledAt: Date;
      completedAt: null;
      accessType: "SECTION";
      accessedSections: Array<{ sectionId: string; title: string }>;
      userInfo: EnrollmentUserInfo | null;
      courseInfo: EnrollmentCourseInfo;
      companyInfo: { id: null; name: null };
    };

    // Get courses with section access (but not full enrollment)
    const sectionAccessCourses: SectionAccessRecord[] = [];
    let sectionAccessCount = 0;

    if (filters?.userId && (!filters?.status || filters?.status === "ACTIVE")) {
      const sectionAccessConditions = [
        eq(sectionAccess.userId, filters.userId),
      ];
      if (filters?.courseId) {
        sectionAccessConditions.push(
          eq(sectionAccess.courseId, filters.courseId),
        );
      }

      // Get all enrolled course IDs for this user (not just current page) to exclude from section access
      const allEnrolledCourseIds = await this.db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(eq(enrollments.userId, filters.userId));
      const enrolledCourseIdSet = new Set(
        allEnrolledCourseIds.map((e) => e.courseId),
      );

      // Get unique course IDs with section access that don't have full enrollment
      // Apply deterministic ordering by courseId for stable pagination
      const sectionAccessCoursesQuery = await this.db
        .selectDistinct({ courseId: sectionAccess.courseId })
        .from(sectionAccess)
        .where(and(...sectionAccessConditions))
        .orderBy(asc(sectionAccess.courseId));

      const sectionAccessCourseIds = sectionAccessCoursesQuery
        .map((sa) => sa.courseId)
        .filter((cId) => !enrolledCourseIdSet.has(cId));

      sectionAccessCount = sectionAccessCourseIds.length;

      // Only process section access if we need it for current page
      // Calculate if current page might include section access records
      const fullEnrollmentPages = Math.ceil(fullEnrollmentCount / limit);
      const currentPageNeedsSectionAccess =
        page > fullEnrollmentPages ||
        (page === fullEnrollmentPages && fullEnrollments.length < limit);

      if (sectionAccessCourseIds.length > 0 && currentPageNeedsSectionAccess) {
        // Calculate offset for section access records
        const sectionAccessOffset = Math.max(0, offset - fullEnrollmentCount);
        const sectionAccessLimit = limit - fullEnrollments.length;

        if (sectionAccessLimit > 0) {
          // Get paginated course IDs for section access
          const paginatedSectionAccessCourseIds = sectionAccessCourseIds.slice(
            sectionAccessOffset,
            sectionAccessOffset + sectionAccessLimit,
          );

          if (paginatedSectionAccessCourseIds.length > 0) {
            // Batch fetch: course details, user info, and all section access records in parallel
            const [courseDetails, userInfo, allSectionAccessRecords] =
              await Promise.all([
                this.db
                  .select({
                    id: courses.courseId,
                    title: courses.title,
                    slug: courses.slug,
                    description: courses.description,
                    thumbnail: courses.thumbnail,
                    price: courses.price,
                    currency: courses.currency,
                    categoryId: courses.categoryId,
                    categoryName: sql<string>`${categories.name}`,
                    categorySlug: categories.slug,
                    categoryDescription: categories.description,
                  })
                  .from(courses)
                  .leftJoin(
                    categories,
                    eq(courses.categoryId, categories.categoryId),
                  )
                  .where(
                    inArray(courses.courseId, paginatedSectionAccessCourseIds),
                  ),
                this.db
                  .select({
                    id: users.userId,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                  })
                  .from(users)
                  .where(eq(users.userId, filters.userId))
                  .limit(1),
                this.db
                  .select({
                    courseId: sectionAccess.courseId,
                    sectionId: sectionAccess.sectionId,
                    createdAt: sectionAccess.createdAt,
                  })
                  .from(sectionAccess)
                  .where(
                    and(
                      eq(sectionAccess.userId, filters.userId),
                      inArray(
                        sectionAccess.courseId,
                        paginatedSectionAccessCourseIds,
                      ),
                    ),
                  ),
              ]);

            // Get all section IDs from section access records
            const allSectionIds = [
              ...new Set(allSectionAccessRecords.map((sa) => sa.sectionId)),
            ];

            // Batch fetch all sections at once
            const allSections =
              allSectionIds.length > 0
                ? await this.db
                    .select({
                      sectionId: courseSections.sectionId,
                      title: courseSections.title,
                      courseId: courseSections.courseId,
                    })
                    .from(courseSections)
                    .where(inArray(courseSections.sectionId, allSectionIds))
                : [];

            // Create a map for quick section lookup
            const sectionsByCourse = new Map<
              string,
              Array<{ sectionId: string; title: string }>
            >();
            for (const section of allSections) {
              const existingSections = sectionsByCourse.get(section.courseId);
              const entry = { sectionId: section.sectionId, title: section.title };
              if (existingSections !== undefined) {
                existingSections.push(entry);
              } else {
                sectionsByCourse.set(section.courseId, [entry]);
              }
            }

            // Build section access records
            for (const course of courseDetails) {
              const courseAccessRecords = allSectionAccessRecords.filter(
                (sa) => sa.courseId === course.id,
              );

              const earliestAccess = courseAccessRecords.reduce(
                (earliest, record) =>
                  record.createdAt < earliest ? record.createdAt : earliest,
                courseAccessRecords[0]?.createdAt || new Date(),
              );

              const sectionAccessRecord: SectionAccessRecord = {
                enrollmentId: `section-access-${course.id}`,
                userId: filters.userId,
                courseId: course.id,
                companyId: null,
                status: "ACTIVE" as const,
                source: "SELF_PURCHASE" as const,
                grantedById: null,
                grantedByInfo: null,
                enrolledAt: earliestAccess,
                completedAt: null,
                accessType: "SECTION" as const,
                accessedSections: sectionsByCourse.get(course.id) || [],
                userInfo: userInfo[0] || null,
                courseInfo: course,
                companyInfo: { id: null, name: null },
              };

              sectionAccessCourses.push(sectionAccessRecord);
            }
          }
        }
      }
    }

    const allRecords: Array<{
      enrollmentId: string;
      userId: string;
      courseId: string;
      companyId: string | null;
      status: string;
      source: string;
      grantedById: string | null;
      grantedByInfo: GrantedByInfo | null;
      enrolledAt: Date;
      completedAt: Date | null;
      accessType: "FULL" | "SECTION";
      accessedSections: Array<{ sectionId: string; title: string }> | null;
      userInfo: EnrollmentUserInfo | null;
      courseInfo: EnrollmentCourseInfo;
      companyInfo: { id: string | null; name: string | null } | null;
    }> = [
      ...fullEnrollments.map((e) => ({
        ...e,
        accessType: "FULL" as const,
        accessedSections: null as Array<{
          sectionId: string;
          title: string;
        }> | null,
      })),
      ...sectionAccessCourses,
    ];

    const totalCount = fullEnrollmentCount + sectionAccessCount;

    const mappedData = allRecords.map((e) => ({
      ...e,
      user: e.userInfo,
      course: {
        ...e.courseInfo,
        thumbnail: this.ensureThumbnailUrl(e.courseInfo?.thumbnail),
        category: e.courseInfo
          ? {
              id: e.courseInfo.categoryId,
              name: e.courseInfo.categoryName,
              slug: e.courseInfo.categorySlug,
              description: e.courseInfo.categoryDescription,
            }
          : null,
      },
      company: e.companyInfo,
      grantedBy: e.grantedByInfo
        ? {
            id: e.grantedByInfo.id,
            name: this.resolveDisplayName(e.grantedByInfo.firstName, e.grantedByInfo.lastName, e.grantedByInfo.email),
          }
        : null,
    }));

    return {
      data: mappedData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findOne(id: string, requestUserId?: string, requestUserRole?: string) {
    const [enrollment] = await this.db
      .select()
      .from(enrollments)
      .where(eq(enrollments.enrollmentId, id))
      .limit(1);

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    // Ownership check: learners can only view their own enrollments.
    // Admins see any enrollment. requestUserId is omitted for internal service calls.
    if (
      requestUserId &&
      requestUserRole !== 'PLATFORM_ADMIN' &&
      requestUserRole !== 'CORPORATE_ADMIN' &&
      enrollment.userId !== requestUserId
    ) {
      throw new ForbiddenException('You can only view your own enrollments');
    }

    return enrollment;
  }

  async create(dto: CreateEnrollmentDto, userId: string, userRole: string) {
    // Check if course exists
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.courseId, dto.courseId))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    // Check if already enrolled
    const [existing] = await this.db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, dto.userId || userId),
          eq(enrollments.courseId, dto.courseId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException("User is already enrolled in this course");
    }

    // Permission check: users can only enroll themselves unless admin
    if (
      userRole !== "PLATFORM_ADMIN" &&
      userRole !== "CORPORATE_ADMIN" &&
      dto.userId &&
      dto.userId !== userId
    ) {
      throw new ForbiddenException("You can only enroll yourself");
    }

    try {
      const [newEnrollment] = await this.db
        .insert(enrollments)
        .values({
          userId: dto.userId || userId,
          courseId: dto.courseId,
          companyId: dto.companyId || null,
          status: "ACTIVE",
        })
        .onConflictDoNothing()
        .returning({ enrollmentId: enrollments.enrollmentId });

      if (!newEnrollment) {
        const [existingEnrollment] = await this.db
          .select()
          .from(enrollments)
          .where(
            and(
              eq(enrollments.userId, dto.userId || userId),
              eq(enrollments.courseId, dto.courseId),
            ),
          )
          .limit(1);

        return existingEnrollment;
      }

      const enrollment = await this.findOne(newEnrollment.enrollmentId);

      try {
        const [user] = await this.db
          .select()
          .from(users)
          .where(eq(users.userId, dto.userId || userId))
          .limit(1);

        if (user && course) {
          await this.emailService.sendEnrollmentConfirmationEmail({
            firstName: user.firstName,
            email: user.email,
            courseTitle: course.title,
            courseSlug: course.slug,
            enrollmentDate: enrollment.enrolledAt,
          });
        }
      } catch { /* non-critical: swallow */ }

      return enrollment;
    } catch (error) {
      // Fallback if onConflictDoNothing isn't supported or other error
      const [existing] = await this.db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, dto.userId || userId),
            eq(enrollments.courseId, dto.courseId),
          ),
        )
        .limit(1);

      if (existing) {
        return existing;
      }
      throw error;
    }
  }

  async manualCreate(learnerUserId: string, courseId: string, adminUserId: string) {
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.courseId, courseId))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const [existing] = await this.db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, learnerUserId), eq(enrollments.courseId, courseId)))
      .limit(1);

    if (existing) {
      throw new ConflictException("User is already enrolled in this course");
    }

    const [newEnrollment] = await this.db
      .insert(enrollments)
      .values({
        userId: learnerUserId,
        courseId,
        source: "ADMIN_GRANT",
        grantedBy: adminUserId,
        status: "ACTIVE",
      })
      .returning({ enrollmentId: enrollments.enrollmentId });

    return this.findOne(newEnrollment.enrollmentId);
  }

  async bulkCreate(
    dto: BulkEnrollmentDto,
    companyId: string,
    userRole: string,
  ) {
    if (userRole !== "CORPORATE_ADMIN" && userRole !== "PLATFORM_ADMIN") {
      throw new ForbiddenException(
        "Only corporate admins can perform bulk enrollments",
      );
    }

    // Verify course exists
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.courseId, dto.courseId))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    // Single batch INSERT instead of 2×N sequential round-trips.
    // onConflictDoNothing() skips users already enrolled without erroring.
    const inserted = await this.db
      .insert(enrollments)
      .values(
        dto.userIds.map((userId) => ({
          userId,
          courseId: dto.courseId,
          companyId,
          status: "ACTIVE" as const,
        })),
      )
      .onConflictDoNothing()
      .returning({
        enrollmentId: enrollments.enrollmentId,
        userId: enrollments.userId,
      });

    const insertedUserIds = new Set(inserted.map((r) => r.userId));
    const results = inserted;
    const errors = dto.userIds
      .filter((userId) => !insertedUserIds.has(userId))
      .map((userId) => ({ userId, error: "Already enrolled" }));

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  async updateStatus(
    id: string,
    status: "ACTIVE" | "COMPLETED" | "REVOKED",
    userRole: string,
  ) {
    const [enrollment] = await this.db
      .select()
      .from(enrollments)
      .where(eq(enrollments.enrollmentId, id))
      .limit(1);

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    if (
      status === "REVOKED" &&
      userRole !== "PLATFORM_ADMIN" &&
      userRole !== "CORPORATE_ADMIN"
    ) {
      throw new ForbiddenException("Only admins can revoke enrollments");
    }

    const wasCompleted = enrollment.status === "COMPLETED";
    const completedAt = status === "COMPLETED" ? new Date() : null;

    const [updated] = await this.db
      .update(enrollments)
      .set({
        status,
        completedAt,
      })
      .where(eq(enrollments.enrollmentId, id))
      .returning({ enrollmentId: enrollments.enrollmentId });

    if (status === "COMPLETED" && !wasCompleted) {
      try {
        const [user] = await this.db
          .select()
          .from(users)
          .where(eq(users.userId, enrollment.userId))
          .limit(1);

        const [course] = await this.db
          .select()
          .from(courses)
          .where(eq(courses.courseId, enrollment.courseId))
          .limit(1);

        if (user && course) {
          await this.emailService.sendCourseCompletionEmail({
            firstName: user.firstName,
            email: user.email,
            courseTitle: course.title,
            courseSlug: course.slug,
            completedDate: completedAt || new Date(),
          });
        }
      } catch { /* non-critical: swallow */ }
    }

    return updated;
  }

  async delete(id: string, userRole: string) {
    if (userRole !== "PLATFORM_ADMIN" && userRole !== "CORPORATE_ADMIN") {
      throw new ForbiddenException("Only admins can delete enrollments");
    }

    const [enrollment] = await this.db
      .select()
      .from(enrollments)
      .where(eq(enrollments.enrollmentId, id))
      .limit(1);

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    // Soft-delete: set status to REVOKED instead of deleting the row
    await this.db
      .update(enrollments)
      .set({
        status: "REVOKED",
      })
      .where(eq(enrollments.enrollmentId, id));

    return { message: "Enrollment revoked successfully" };
  }
}
