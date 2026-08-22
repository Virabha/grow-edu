import { Inject, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { exportJobs } from "../../database/schema";
import { JOB_QUEUE, JobQueue } from "../../jobs/job-queue";
import { NotificationsService } from "../../notifications/notifications.service";
import { CorporateReportService } from "./corporate-report.service";

const EXPORT_JOB_NAME = "export-job.run";

type ExportJobPayload = {
  exportJobId: string;
};

@Injectable()
export class ExportJobService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly reports: CorporateReportService,
    private readonly notifications: NotificationsService,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    this.jobs.register<ExportJobPayload>(
      EXPORT_JOB_NAME,
      async ({ exportJobId }) => {
        await this.runExport(exportJobId);
      },
    );
  }

  async createExportJob(
    contractId: string,
    requestedBy: string,
    reportType: string,
    subGroupId?: string,
  ): Promise<{ exportJobId: string; status: string }> {
    const [job] = await this.db
      .insert(exportJobs)
      .values({ contractId, requestedBy, reportType, subGroupId })
      .returning();

    await this.jobs.enqueue<ExportJobPayload>(EXPORT_JOB_NAME, {
      exportJobId: job.exportJobId,
    });

    return { exportJobId: job.exportJobId, status: job.status };
  }

  async getExportJob(exportJobId: string, contractId: string) {
    const [job] = await this.db
      .select({
        exportJobId: exportJobs.exportJobId,
        status: exportJobs.status,
        failureReason: exportJobs.failureReason,
        reportType: exportJobs.reportType,
        subGroupId: exportJobs.subGroupId,
        createdAt: exportJobs.createdAt,
        updatedAt: exportJobs.updatedAt,
      })
      .from(exportJobs)
      .where(
        and(
          eq(exportJobs.exportJobId, exportJobId),
          eq(exportJobs.contractId, contractId),
        ),
      )
      .limit(1);

    if (!job) throw new NotFoundException("Export job not found");
    return job;
  }

  async downloadExportJob(exportJobId: string, contractId: string): Promise<unknown> {
    const [job] = await this.db
      .select({
        status: exportJobs.status,
        exportData: exportJobs.exportData,
      })
      .from(exportJobs)
      .where(
        and(
          eq(exportJobs.exportJobId, exportJobId),
          eq(exportJobs.contractId, contractId),
        ),
      )
      .limit(1);

    if (!job) throw new NotFoundException("Export job not found");
    if (job.status !== "DONE") throw new NotFoundException("Export is not ready");
    return job.exportData;
  }

  private async runExport(exportJobId: string): Promise<void> {
    const [job] = await this.db
      .select()
      .from(exportJobs)
      .where(eq(exportJobs.exportJobId, exportJobId))
      .limit(1);

    if (!job) return;

    await this.db
      .update(exportJobs)
      .set({ status: "PROCESSING", updatedAt: this.clock.now() })
      .where(eq(exportJobs.exportJobId, exportJobId));

    try {
      let data: unknown;

      if (job.reportType === "attendance") {
        data = await this.reports.attendanceReport(
          job.contractId,
          job.subGroupId ?? undefined,
        );
      } else if (job.reportType === "test-performance") {
        data = await this.reports.testPerformanceReport(
          job.contractId,
          job.subGroupId ?? undefined,
        );
      } else {
        throw new Error(`Unknown report type: ${job.reportType}`);
      }

      await this.db
        .update(exportJobs)
        .set({ status: "DONE", exportData: data, updatedAt: this.clock.now() })
        .where(eq(exportJobs.exportJobId, exportJobId));

      await this.notifications.create({
        userId: job.requestedBy,
        type: "GENERIC",
        title: "Your export is ready",
        body: `Your ${job.reportType} report is ready to download.`,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);

      await this.db
        .update(exportJobs)
        .set({ status: "FAILED", failureReason: reason, updatedAt: this.clock.now() })
        .where(eq(exportJobs.exportJobId, exportJobId));

      await this.notifications.create({
        userId: job.requestedBy,
        type: "GENERIC",
        title: "Your export failed",
        body: `Your ${job.reportType} report could not be generated: ${reason}`,
      });
    }
  }
}
