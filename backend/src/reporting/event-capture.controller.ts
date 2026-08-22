import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CaptureEventDto } from "./dto/reporting.dto";
import { EventCaptureService } from "./event-capture.service";

@ApiTags("reporting")
@Controller("events")
export class EventCaptureController {
  constructor(private readonly capture: EventCaptureService) {}

  @Public()
  @HttpCode(202)
  @ApiOperation({ summary: "Capture a funnel event" })
  @Post()
  async captureEvent(
    @Body() dto: CaptureEventDto,
    @CurrentUser() user?: { userId?: string },
  ) {
    await this.capture.capture({
      kind: dto.kind as "PAGE_VIEW" | "CATALOGUE_VIEW" | "CHECKOUT_START" | "CHECKOUT_COMPLETE",
      batchId: dto.batchId,
      source: dto.source,
      sessionKey: dto.sessionKey,
      userId: user?.userId,
    });
    return {};
  }
}
