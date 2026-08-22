import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import {
  SubscribeToPushDto,
  UnsubscribeFromPushDto,
} from "./dto/subscribe-to-push.dto";
import { PushService } from "./push.service";

interface AuthedUser {
  userId: string;
  deviceId?: string;
}

@ApiTags("push")
@Controller("push")
export class PushController {
  constructor(private readonly push: PushService) {}

  @Public()
  @ApiOperation({ summary: "The VAPID public key the browser needs" })
  @Get("public-key")
  publicKey() {
    return { publicKey: this.push.publicKey() };
  }

  @Authenticated()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Register this browser for push" })
  @Post("subscribe")
  subscribe(
    @Body() dto: SubscribeToPushDto,
    @CurrentUser() user: AuthedUser,
    @Req() req: { headers: Record<string, string> },
  ) {
    return this.push.subscribe(
      user.userId,
      dto,
      req.headers["user-agent"] ?? null,
      user.deviceId ?? null,
    );
  }

  @Authenticated()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Stop pushing to this browser" })
  @HttpCode(HttpStatus.OK)
  @Delete("subscribe")
  unsubscribe(
    @Body() dto: UnsubscribeFromPushDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.push.unsubscribe(user.userId, dto.endpoint);
  }

  @Authenticated()
  @ApiBearerAuth()
  @ApiOperation({ summary: "The browsers registered against your account" })
  @Get("subscriptions")
  list(@CurrentUser() user: AuthedUser) {
    return this.push.listFor(user.userId);
  }
}
