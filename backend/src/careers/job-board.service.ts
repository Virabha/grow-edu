import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { jobApplications, jobOpenings, portfolios } from "../database/schema";
import { ApplyDto } from "./dto/apply.dto";
import { PostOpeningDto } from "./dto/post-opening.dto";
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto";

type DbType = PostgresJsDatabase<typeof schema>;

@Injectable()
export class JobBoardService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async postOpening(dto: PostOpeningDto, postedBy: string) {
    const now = this.clock.now();
    const [row] = await this.db
      .insert(jobOpenings)
      .values({
        title: dto.title,
        description: dto.description,
        location: dto.location ?? null,
        tags: dto.tags ?? [],
        postedBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  async listOpenings(viewerRole: string) {
    if (viewerRole === "PLATFORM_ADMIN") {
      return this.db
        .select()
        .from(jobOpenings)
        .orderBy(jobOpenings.createdAt);
    }
    return this.db
      .select()
      .from(jobOpenings)
      .where(eq(jobOpenings.status, "OPEN"))
      .orderBy(jobOpenings.createdAt);
  }

  async getOpening(openingId: string, viewerRole: string) {
    const [opening] = await this.db
      .select()
      .from(jobOpenings)
      .where(eq(jobOpenings.openingId, openingId))
      .limit(1);

    if (!opening) throw new NotFoundException("Opening not found");
    if (opening.status !== "OPEN" && viewerRole !== "PLATFORM_ADMIN") {
      throw new NotFoundException("Opening not found");
    }

    return opening;
  }

  async closeOpening(openingId: string) {
    const now = this.clock.now();
    const [row] = await this.db
      .select()
      .from(jobOpenings)
      .where(eq(jobOpenings.openingId, openingId))
      .limit(1);
    if (!row) throw new NotFoundException("Opening not found");

    const [updated] = await this.db
      .update(jobOpenings)
      .set({ status: "CLOSED", closedAt: now, updatedAt: now })
      .where(eq(jobOpenings.openingId, openingId))
      .returning();
    return updated;
  }

  async apply(openingId: string, dto: ApplyDto, studentId: string) {
    const now = this.clock.now();

    const [opening] = await this.db
      .select()
      .from(jobOpenings)
      .where(eq(jobOpenings.openingId, openingId))
      .limit(1);
    if (!opening) throw new NotFoundException("Opening not found");
    if (opening.status !== "OPEN") {
      throw new UnprocessableEntityException("Opening is closed");
    }

    const [portfolio] = await this.db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.portfolioId, dto.portfolioId),
          eq(portfolios.userId, studentId),
        ),
      )
      .limit(1);

    if (!portfolio) {
      throw new NotFoundException("Portfolio not found");
    }
    if (!portfolio.isPublished) {
      throw new ForbiddenException("Portfolio must be published before applying");
    }

    try {
      const [row] = await this.db
        .insert(jobApplications)
        .values({
          openingId,
          studentId,
          portfolioId: dto.portfolioId,
          appliedAt: now,
          updatedAt: now,
        })
        .returning();
      return row;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("job_applications_opening_student_unique")
      ) {
        throw new ConflictException("Already applied to this opening");
      }
      throw err;
    }
  }

  async listApplications(viewerId: string, viewerRole: string) {
    if (viewerRole === "PLATFORM_ADMIN") {
      return this.db.select().from(jobApplications);
    }
    return this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.studentId, viewerId));
  }

  async updateApplicationStatus(
    applicationId: string,
    dto: UpdateApplicationStatusDto,
    reviewedBy: string,
  ) {
    const now = this.clock.now();
    const [app] = await this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.applicationId, applicationId))
      .limit(1);

    if (!app) throw new NotFoundException("Application not found");

    const [updated] = await this.db
      .update(jobApplications)
      .set({
        status: dto.status as (typeof schema.jobApplications)["$inferSelect"]["status"],
        reviewedBy,
        reviewedAt: now,
        notes: dto.notes ?? app.notes,
        updatedAt: now,
      })
      .where(eq(jobApplications.applicationId, applicationId))
      .returning();
    return updated;
  }

  async getApplicationPortfolio(applicationId: string) {
    const [app] = await this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.applicationId, applicationId))
      .limit(1);

    if (!app) throw new NotFoundException("Application not found");

    const [portfolio] = await this.db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.portfolioId, app.portfolioId),
          eq(portfolios.isPublished, true),
        ),
      )
      .limit(1);

    if (!portfolio) {
      throw new NotFoundException("Published portfolio not found");
    }

    return portfolio;
  }
}
