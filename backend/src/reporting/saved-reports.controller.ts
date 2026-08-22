import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SaveReportDto, ScheduleReportDto, ShareReportDto } from "./dto/reporting.dto";
import { SavedReportsService } from "./saved-reports.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("reporting")
@ApiBearerAuth()
@Controller("reports/saved")
export class SavedReportsController {
  constructor(private readonly saved: SavedReportsService) {}

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Save a report definition" })
  @Post()
  create(@Body() dto: SaveReportDto, @CurrentUser() user: AuthedUser) {
    return this.saved.save(
      dto.title,
      {
        dimensions: dto.dimensions,
        measures: dto.measures,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
      },
      { userId: user.userId, role: user.role },
    );
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "List my saved reports" })
  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.saved.list({ userId: user.userId, role: user.role });
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Run a saved report against viewer scope" })
  @Post(":reportId/run")
  run(@Param("reportId") reportId: string, @CurrentUser() user: AuthedUser) {
    return this.saved.run(reportId, { userId: user.userId, role: user.role });
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Export a saved report (same rows as interactive run)" })
  @Get(":reportId/export")
  export(@Param("reportId") reportId: string, @CurrentUser() user: AuthedUser) {
    return this.saved.export(reportId, { userId: user.userId, role: user.role });
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Schedule a saved report to run on a cadence" })
  @Post(":reportId/schedule")
  scheduleReport(
    @Param("reportId") reportId: string,
    @Body() dto: ScheduleReportDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.saved.schedule(reportId, { userId: user.userId, role: user.role }, dto.cadence);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Get the schedule for a saved report" })
  @Get(":reportId/schedule")
  getSchedule(@Param("reportId") reportId: string, @CurrentUser() user: AuthedUser) {
    return this.saved.getSchedule(reportId, { userId: user.userId, role: user.role });
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Share a report with another user" })
  @Post(":reportId/share")
  share(
    @Param("reportId") reportId: string,
    @Body() dto: ShareReportDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.saved.share(reportId, { userId: user.userId, role: user.role }, dto.grantedTo);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: "Revoke a share" })
  @Delete(":reportId/share/:targetId")
  revokeShare(
    @Param("reportId") reportId: string,
    @Param("targetId") targetId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.saved.revokeShare(reportId, { userId: user.userId, role: user.role }, targetId);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a saved report" })
  @Delete(":reportId")
  delete(@Param("reportId") reportId: string, @CurrentUser() user: AuthedUser) {
    return this.saved.delete(reportId, { userId: user.userId, role: user.role });
  }
}
