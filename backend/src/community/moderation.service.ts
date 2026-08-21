import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { contentReports } from '../database/schema';
import { BatchAccessService, Viewer } from '../batches/access/batch-access.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

type Report = typeof contentReports.$inferSelect;
type StudentReportView = Omit<Report, 'reportedBy'>;

function toStudentView(report: Report): StudentReportView {
  const { reportedBy: _reportedBy, ...rest } = report;
  return rest;
}

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
  ) {}

  async createReport(
    batchId: string,
    dto: CreateReportDto,
    viewer: { userId: string; role: string },
  ) {
    const isStaff = await this.access.isStaff(batchId, viewer);
    if (isStaff) {
      throw new ForbiddenException('Staff do not file reports against content');
    }
    const existing = await this.db
      .select({ reportId: contentReports.reportId })
      .from(contentReports)
      .where(
        and(
          eq(contentReports.reportedBy, viewer.userId),
          eq(contentReports.targetKind, dto.targetKind),
          eq(contentReports.targetId, dto.targetId),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException('You have already reported this item');
    }
    const now = this.clock.now();
    const [report] = await this.db
      .insert(contentReports)
      .values({
        batchId,
        targetKind: dto.targetKind,
        targetId: dto.targetId,
        reportedBy: viewer.userId,
        reason: dto.reason,
        createdAt: now,
      })
      .returning();
    return toStudentView(report);
  }

  async listReports(batchId: string, viewer: Viewer) {
    const isStaff = await this.access.isStaff(batchId, viewer);
    if (!isStaff) {
      throw new ForbiddenException('Access denied');
    }
    return this.db
      .select()
      .from(contentReports)
      .where(eq(contentReports.batchId, batchId));
  }

  async resolveReport(
    batchId: string,
    reportId: string,
    dto: ResolveReportDto,
    viewer: { userId: string; role: string },
  ) {
    const isStaff = await this.access.isStaff(batchId, viewer);
    if (!isStaff) {
      throw new ForbiddenException('Access denied');
    }
    const [report] = await this.db
      .select({ reportId: contentReports.reportId, status: contentReports.status })
      .from(contentReports)
      .where(
        and(
          eq(contentReports.reportId, reportId),
          eq(contentReports.batchId, batchId),
        ),
      )
      .limit(1);
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== 'OPEN') {
      throw new ConflictException('Report is already resolved');
    }
    const now = this.clock.now();
    const [updated] = await this.db
      .update(contentReports)
      .set({
        status: dto.status,
        outcome: dto.outcome ?? null,
        resolvedBy: viewer.userId,
        resolvedAt: now,
      })
      .where(eq(contentReports.reportId, reportId))
      .returning();
    return updated;
  }
}
