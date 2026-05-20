import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  OnModuleInit,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { timingSafeEqual } from "crypto";
import { AppConfigService } from "../config";
import { VideoEncodingService } from "./video-encoding.service";
import { BunnyWebhookDto } from "./dto/bunny-webhook.dto";

@ApiTags("video-encoding")
@Controller("video-encoding")
@SkipThrottle()
export class VideoEncodingWebhookController implements OnModuleInit {
  private readonly logger = new Logger(VideoEncodingWebhookController.name);

  constructor(
    private readonly videoEncodingService: VideoEncodingService,
    private readonly configService: AppConfigService,
  ) {}

  onModuleInit() {
    if (!this.configService.webhookSecret) {
      const msg =
        "WEBHOOK_SECRET is not configured. The Bunny Stream webhook endpoint will reject every request.";
      if (this.configService.isProduction()) {
        throw new Error(msg);
      }
      this.logger.warn(msg);
    }
  }

  @ApiOperation({
    summary: "Bunny Stream webhook for video encoding completion",
  })
  @ApiResponse({ status: 200, description: "Webhook processed" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: BunnyWebhookDto,
    @Headers("x-webhook-secret") providedSecret: string | undefined,
  ) {
    const expectedSecret = this.configService.webhookSecret;
    if (!expectedSecret) {
      throw new UnauthorizedException("Webhook secret not configured");
    }
    if (!providedSecret || !safeEqual(providedSecret, expectedSecret)) {
      throw new UnauthorizedException("Invalid webhook secret");
    }

    const { VideoGuid: videoGuid, Status: bunnyStatus } = body;

    let status: "COMPLETED" | "FAILED" | null = null;
    let errorMessage: string | undefined;

    if (bunnyStatus === 3 || bunnyStatus === 4) {
      status = "COMPLETED";
    } else if (bunnyStatus === 5 || bunnyStatus === 6) {
      status = "FAILED";
      errorMessage =
        bunnyStatus === 5 ? "Video encoding failed" : "Video upload failed";
    }

    if (status) {
      await this.videoEncodingService.handleJobCompletion(
        videoGuid,
        status,
        errorMessage,
      );
    }

    return { received: true, processed: !!status, videoGuid };
  }
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
