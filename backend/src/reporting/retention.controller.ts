import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RetentionService } from "./retention.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("reporting")
@ApiBearerAuth()
@Controller("reports/retention")
export class RetentionController {
  constructor(private readonly retention: RetentionService) {}

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Get materialised retention cohort rows" })
  @Get()
  get(@CurrentUser() user: AuthedUser) {
    return this.retention.getRetention({ userId: user.userId, role: user.role });
  }
}
