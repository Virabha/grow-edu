import { Controller, Get, Param, Post, Query } from "@nestjs/common";

import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { AnomalyDetectionService } from "./anomaly-detection.service";
import { QueryFlagsDto } from "./dto/query-flags.dto";

@Controller("assessment/integrity")
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
export class IntegrityController {
  constructor(private readonly detection: AnomalyDetectionService) {}

  @Post("tests/:testId/scan")
  scan(@Param("testId") testId: string) {
    return this.detection.scanTest(testId);
  }

  @Get("flags")
  flags(@Query() query: QueryFlagsDto) {
    return this.detection.listFlags(query.testId, query.userId);
  }
}
