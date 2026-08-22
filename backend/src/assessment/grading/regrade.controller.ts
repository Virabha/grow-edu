import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { OpenRegradeRequestDto, ResolveRegradeDto } from "./dto/regrade.dto";
import { RegradeService } from "./regrade.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Authenticated()
@Controller("assessment/regrade")
export class RegradeController {
  constructor(private readonly regrade: RegradeService) {}

  @ApiOperation({ summary: "Open a regrade request for a graded answer" })
  @Post()
  open(@Body() dto: OpenRegradeRequestDto, @CurrentUser() user: AuthedUser) {
    return this.regrade.openRequest(dto, user.userId);
  }
}

@ApiTags("assessment")
@ApiBearerAuth()
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
@Controller("assessment/regrade")
export class RegradeQueueController {
  constructor(private readonly regrade: RegradeService) {}

  @ApiOperation({ summary: "List open regrade requests across instructor batches" })
  @Get("queue")
  queue(@CurrentUser() user: AuthedUser) {
    return this.regrade.getQueue(user.userId, user.role);
  }

  @ApiOperation({ summary: "Resolve a regrade request" })
  @Post(":requestId/resolve")
  resolve(
    @Param("requestId") requestId: string,
    @Body() dto: ResolveRegradeDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.regrade.resolve(requestId, dto, user.userId, user.role);
  }
}
