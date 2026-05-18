import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AppConfigService } from "../config";
import { VideoEncodingService } from "./video-encoding.service";

@ApiTags("video-encoding")
@Controller("video-encoding")
export class VideoEncodingWebhookController {
  constructor(
    private readonly videoEncodingService: VideoEncodingService,
    private readonly configService: AppConfigService,
  ) {}

  @ApiOperation({
    summary: "Bunny Stream webhook for video encoding completion",
  })
  @ApiResponse({ status: 200, description: "Webhook processed" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers("x-webhook-secret") webhookSecret: string | undefined,
  ) {
    const expectedSecret = this.configService.webhookSecret;
    if (expectedSecret && webhookSecret !== expectedSecret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }

    // Bunny Stream webhook format: { VideoGuid, Status, ... }
    // Status: 3 = Finished (transcoding complete), 5 = Error
    const videoGuid: string | undefined = body?.VideoGuid;
    const bunnyStatus: number | undefined = body?.Status;

    if (!videoGuid || bunnyStatus === undefined) {
      return { received: true, processed: false, reason: "Missing VideoGuid or Status" };
    }

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

    return {
      received: true,
      processed: !!status,
      videoGuid,
    };
  }
}
