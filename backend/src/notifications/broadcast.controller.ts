import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { BroadcastService } from "./broadcast.service";
import { SendBroadcastDto } from "./dto/send-broadcast.dto";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("broadcasts")
@ApiBearerAuth()
@Controller("admin/broadcasts")
export class BroadcastController {
  constructor(private readonly broadcasts: BroadcastService) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: "Send a message to exactly one audience" })
  @Post()
  send(@Body() dto: SendBroadcastDto, @CurrentUser() user: AuthedUser) {
    return this.broadcasts.send(dto, user);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "What has been sent, to whom and when" })
  @Get()
  history() {
    return this.broadcasts.history();
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Who exactly received one broadcast" })
  @Get(":broadcastId")
  recipients(@Param("broadcastId") broadcastId: string) {
    return this.broadcasts.recipientsOf(broadcastId);
  }
}
