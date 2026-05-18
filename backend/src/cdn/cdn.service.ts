import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { AppConfigService } from "../config";

@Injectable()
export class CdnService {
  private readonly logger = new Logger(CdnService.name);

  constructor(private configService: AppConfigService) {}

  /**
   * Generate a signed Bunny Stream embed URL for the given video.
   * Uses Bunny Stream token format: SHA256_HEX(tokenKey + videoId + expires)
   * The embed URL handles HLS, token auth, DRM, and player settings internally.
   */
  getSignedEmbedUrl(videoId: string, expiresIn: number = 600): string {
    const libraryId = this.configService.bunnyStreamLibraryId;
    const tokenKey = this.configService.bunnyStreamTokenKey;

    if (!libraryId) {
      throw new Error("BUNNY_STREAM_LIBRARY_ID is not configured");
    }

    let embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;

    // If token auth is configured, sign the URL
    if (tokenKey) {
      const expires = Math.floor(Date.now() / 1000) + expiresIn;
      // Bunny Stream token: SHA256 hex of (securityKey + videoId + expirationTime)
      const token = crypto
        .createHash("sha256")
        .update(tokenKey + videoId + expires)
        .digest("hex");

      embedUrl += `?token=${token}&expires=${expires}`;
    }

    this.logger.log(`Generated embed URL for video: ${videoId}`);
    return embedUrl;
  }
}
