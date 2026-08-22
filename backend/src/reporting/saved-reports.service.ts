import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { reportShares, savedReports } from "../database/schema";
import { ReportBuilderService, ReportDefinition, ViewerContext } from "./report-builder.service";

@Injectable()
export class SavedReportsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly builder: ReportBuilderService,
  ) {}

  async save(
    title: string,
    definition: ReportDefinition,
    creator: ViewerContext,
  ) {
    const now = this.clock.now();
    const [row] = await this.db
      .insert(savedReports)
      .values({
        title,
        createdBy: creator.userId,
        definition: definition as (typeof savedReports)["$inferInsert"]["definition"],
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  async list(viewer: ViewerContext) {
    const owned = await this.db
      .select()
      .from(savedReports)
      .where(
        and(
          eq(savedReports.createdBy, viewer.userId),
          eq(savedReports.isDeleted, false),
        ),
      );

    const shared = await this.db
      .select({ report: savedReports })
      .from(reportShares)
      .innerJoin(savedReports, eq(reportShares.reportId, savedReports.reportId))
      .where(
        and(
          eq(reportShares.grantedTo, viewer.userId),
          isNull(reportShares.revokedAt),
          eq(savedReports.isDeleted, false),
        ),
      );

    return [
      ...owned.map((r) => ({ ...r, owned: true })),
      ...shared.map((s) => ({ ...s.report, owned: false })),
    ];
  }

  async run(reportId: string, viewer: ViewerContext) {
    const report = await this.loadAccessible(reportId, viewer.userId);
    const definition = report.definition as ReportDefinition;
    return this.builder.run(definition, viewer);
  }

  async share(reportId: string, owner: ViewerContext, grantedTo: string) {
    const report = await this.loadOwned(reportId, owner.userId);
    const now = this.clock.now();
    const [row] = await this.db
      .insert(reportShares)
      .values({
        reportId: report.reportId,
        grantedTo,
        grantedBy: owner.userId,
        createdAt: now,
      })
      .returning();
    return row;
  }

  async revokeShare(reportId: string, owner: ViewerContext, grantedTo: string) {
    const report = await this.loadOwned(reportId, owner.userId);
    const share = await this.db
      .select()
      .from(reportShares)
      .where(
        and(
          eq(reportShares.reportId, report.reportId),
          eq(reportShares.grantedTo, grantedTo),
          isNull(reportShares.revokedAt),
        ),
      )
      .limit(1);

    if (share.length === 0) {
      throw new NotFoundException("Share not found");
    }

    await this.db
      .update(reportShares)
      .set({ revokedAt: this.clock.now() })
      .where(eq(reportShares.shareId, share[0].shareId));
  }

  async delete(reportId: string, owner: ViewerContext) {
    await this.loadOwned(reportId, owner.userId);
    await this.db
      .update(savedReports)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(eq(savedReports.reportId, reportId));
  }

  private async loadOwned(reportId: string, userId: string) {
    const [report] = await this.db
      .select()
      .from(savedReports)
      .where(
        and(
          eq(savedReports.reportId, reportId),
          eq(savedReports.createdBy, userId),
          eq(savedReports.isDeleted, false),
        ),
      )
      .limit(1);
    if (!report) {
      throw new NotFoundException("Report not found");
    }
    return report;
  }

  private async loadAccessible(reportId: string, userId: string) {
    const [owned] = await this.db
      .select()
      .from(savedReports)
      .where(
        and(
          eq(savedReports.reportId, reportId),
          eq(savedReports.createdBy, userId),
          eq(savedReports.isDeleted, false),
        ),
      )
      .limit(1);

    if (owned) return owned;

    const [sharedRow] = await this.db
      .select({ report: savedReports })
      .from(reportShares)
      .innerJoin(savedReports, eq(reportShares.reportId, savedReports.reportId))
      .where(
        and(
          eq(reportShares.reportId, reportId),
          eq(reportShares.grantedTo, userId),
          isNull(reportShares.revokedAt),
          eq(savedReports.isDeleted, false),
        ),
      )
      .limit(1);

    if (!sharedRow) {
      throw new ForbiddenException("Report not accessible");
    }
    return sharedRow.report;
  }
}
