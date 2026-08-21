import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateExportJobDto } from "./dto/create-export-job.dto";
import {
  CreateReportScheduleDto,
  PauseReportScheduleDto,
} from "./dto/create-report-schedule.dto";
import { ReportScheduleService } from "./report-schedule.service";
import { CorporateReportService } from "./corporate-report.service";
import { ExportJobService } from "./export-job.service";

interface AuthedUser {
  userId: string;
}

@ApiTags("corporate")
@ApiBearerAuth()
@Controller("corporate/me")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CORPORATE_ADMIN)
export class CorporateReportController {
  constructor(
    private readonly reports: CorporateReportService,
    private readonly exportJobs: ExportJobService,
    private readonly schedules: ReportScheduleService,
  ) {}

  @ApiOperation({ summary: "Attendance report for a corporate contract" })
  @Get("contracts/:contractId/reports/attendance")
  async getAttendanceReport(
    @CurrentUser() user: AuthedUser,
    @Param("contractId") contractId: string,
    @Query("subGroupId") subGroupId?: string,
  ) {
    await this.reports.assertOwnsContract(user.userId, contractId);
    return this.reports.attendanceReport(contractId, subGroupId);
  }

  @ApiOperation({ summary: "Test performance report for a corporate contract" })
  @Get("contracts/:contractId/reports/test-performance")
  async getTestPerformanceReport(
    @CurrentUser() user: AuthedUser,
    @Param("contractId") contractId: string,
    @Query("subGroupId") subGroupId?: string,
  ) {
    await this.reports.assertOwnsContract(user.userId, contractId);
    return this.reports.testPerformanceReport(contractId, subGroupId);
  }

  @ApiOperation({ summary: "Start an asynchronous export for a report" })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post("contracts/:contractId/reports/export")
  async createExportJob(
    @CurrentUser() user: AuthedUser,
    @Param("contractId") contractId: string,
    @Body() dto: CreateExportJobDto,
  ) {
    await this.reports.assertOwnsContract(user.userId, contractId);
    return this.exportJobs.createExportJob(
      contractId,
      user.userId,
      dto.reportType,
      dto.subGroupId,
    );
  }

  @ApiOperation({ summary: "Poll the status of an async export job" })
  @Get("contracts/:contractId/reports/export/:exportJobId")
  async getExportJob(
    @CurrentUser() user: AuthedUser,
    @Param("contractId") contractId: string,
    @Param("exportJobId") exportJobId: string,
  ) {
    await this.reports.assertOwnsContract(user.userId, contractId);
    return this.exportJobs.getExportJob(exportJobId, contractId);
  }

  @ApiOperation({ summary: "Download a completed export (authenticated)" })
  @Get("contracts/:contractId/reports/export/:exportJobId/download")
  async downloadExport(
    @CurrentUser() user: AuthedUser,
    @Param("contractId") contractId: string,
    @Param("exportJobId") exportJobId: string,
  ) {
    await this.reports.assertOwnsContract(user.userId, contractId);
    return this.exportJobs.downloadExportJob(exportJobId, contractId);
  }

  @ApiOperation({ summary: "Have a summary emailed on a schedule" })
  @Post("contracts/:contractId/report-schedules")
  createSchedule(
    @Param("contractId") contractId: string,
    @Body() dto: CreateReportScheduleDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.schedules.create(contractId, dto, user.userId);
  }

  @ApiOperation({ summary: "The summaries you have scheduled" })
  @Get("contracts/:contractId/report-schedules")
  listSchedules(
    @Param("contractId") contractId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.schedules.list(contractId, user.userId);
  }

  @ApiOperation({ summary: "Pause or resume a scheduled summary" })
  @HttpCode(HttpStatus.OK)
  @Patch("contracts/:contractId/report-schedules/:scheduleId")
  pauseSchedule(
    @Param("contractId") contractId: string,
    @Param("scheduleId") scheduleId: string,
    @Body() dto: PauseReportScheduleDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.schedules.setPaused(
      contractId,
      scheduleId,
      dto.isPaused,
      user.userId,
    );
  }

  @ApiOperation({ summary: "Stop a scheduled summary for good" })
  @Delete("contracts/:contractId/report-schedules/:scheduleId")
  removeSchedule(
    @Param("contractId") contractId: string,
    @Param("scheduleId") scheduleId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.schedules.remove(contractId, scheduleId, user.userId);
  }
}
