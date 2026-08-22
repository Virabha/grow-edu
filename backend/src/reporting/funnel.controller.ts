import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { FunnelQueryDto } from "./dto/reporting.dto";
import { FunnelService } from "./funnel.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("reporting")
@ApiBearerAuth()
@Controller("reports/funnel")
export class FunnelController {
  constructor(private readonly funnel: FunnelService) {}

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @ApiOperation({ summary: "Get funnel drop-off analysis" })
  @Get()
  get(@Query() query: FunnelQueryDto, @CurrentUser() user: AuthedUser) {
    return this.funnel.getFunnel(
      { userId: user.userId, role: user.role },
      {
        fromDate: query.fromDate,
        toDate: query.toDate,
        source: query.source,
      },
    );
  }
}
