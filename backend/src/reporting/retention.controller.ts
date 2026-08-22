import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { RetentionService } from "./retention.service";

@ApiTags("reporting")
@ApiBearerAuth()
@Controller("reports/retention")
export class RetentionController {
  constructor(private readonly retention: RetentionService) {}

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Get materialised retention cohort rows" })
  @Get()
  get() {
    return this.retention.getRetention();
  }
}
