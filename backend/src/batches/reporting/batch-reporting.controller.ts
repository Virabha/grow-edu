import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { BatchManagerGuard } from "../access/batch-manager.guard";
import { BatchReportingService } from "./batch-reporting.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@ApiBearerAuth()
@Controller("batches")
export class BatchReportingController {
  constructor(private readonly reporting: BatchReportingService) {}

  @ApiOperation({ summary: "Unified dashboard for the current user" })
  @UseGuards(JwtAuthGuard)
  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthedUser) {
    return this.reporting.myDashboard(user.userId);
  }

  @ApiOperation({ summary: "Batch analytics (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Get(":batchId/analytics")
  analytics(@Param("batchId") batchId: string) {
    return this.reporting.analytics(batchId);
  }

  @ApiOperation({ summary: "My progress in a batch (learner)" })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/my-progress")
  myProgress(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.reporting.myProgress(batchId, user);
  }
}
