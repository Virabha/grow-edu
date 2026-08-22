import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RunReportDto } from "./dto/reporting.dto";
import { ReportBuilderService } from "./report-builder.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("reporting")
@ApiBearerAuth()
@Controller("reports")
export class ReportBuilderController {
  constructor(private readonly builder: ReportBuilderService) {}

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "List available dimensions and measures" })
  @Get("palette")
  palette() {
    return this.builder.palette();
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Run an ad-hoc report" })
  @Post("run")
  run(@Body() dto: RunReportDto, @CurrentUser() user: AuthedUser) {
    return this.builder.run(
      {
        dimensions: dto.dimensions,
        measures: dto.measures,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
      },
      { userId: user.userId, role: user.role },
    );
  }
}
