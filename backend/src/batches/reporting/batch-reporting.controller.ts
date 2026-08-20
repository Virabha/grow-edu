import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
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

  @Authenticated()
  @ApiOperation({ summary: "Unified dashboard for the current user" })
  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthedUser) {
    return this.reporting.myDashboard(user.userId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Batch analytics (admin or batch teacher)" })
  @Get(":batchId/analytics")
  analytics(@Param("batchId") batchId: string) {
    return this.reporting.analytics(batchId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "My progress in a batch (learner)" })
  @Get(":batchId/my-progress")
  myProgress(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.reporting.myProgress(batchId, user);
  }
}
