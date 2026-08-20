import { Injectable } from "@nestjs/common";
import { ConfigService as NestConfigService } from "@nestjs/config";
import { ConfigSchema } from "./config.schema";

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService<ConfigSchema, true>) {}

  get nodeEnv(): string {
    return this.configService.get("NODE_ENV", { infer: true });
  }

  get port(): number {
    return this.configService.get("PORT", { infer: true });
  }

  get frontendUrl(): string {
    return this.configService.get("FRONTEND_URL", { infer: true });
  }

  get backendUrl(): string {
    return this.configService.get("BACKEND_URL", { infer: true });
  }

  get corsOrigins(): string[] {
    const raw = this.configService.get("CORS_ORIGINS", { infer: true });
    if (raw) {
      return raw
        .split(",")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
    }
    return [this.frontendUrl];
  }

  get databaseUrl(): string {
    return this.configService.get("DATABASE_URL", { infer: true });
  }

  get jwtSecret(): string {
    return this.configService.get("JWT_SECRET", { infer: true });
  }

  get jwtExpiresIn(): string {
    return this.configService.get("JWT_EXPIRES_IN", { infer: true });
  }

  get maxDevicesPerUser(): number {
    return this.configService.get("AUTH_MAX_DEVICES_PER_USER", { infer: true });
  }

  // Bunny Storage
  get bunnyStorageZoneName(): string | undefined {
    return this.configService.get("BUNNY_STORAGE_ZONE_NAME", { infer: true });
  }

  get bunnyStorageApiKey(): string | undefined {
    return this.configService.get("BUNNY_STORAGE_API_KEY", { infer: true });
  }

  get bunnyStorageRegion(): string | undefined {
    return this.configService.get("BUNNY_STORAGE_REGION", { infer: true });
  }

  get bunnyCdnHostname(): string | undefined {
    return this.configService.get("BUNNY_CDN_HOSTNAME", { infer: true });
  }

  // Bunny Stream
  get bunnyStreamLibraryId(): string | undefined {
    return this.configService.get("BUNNY_STREAM_LIBRARY_ID", { infer: true });
  }

  get bunnyStreamApiKey(): string | undefined {
    return this.configService.get("BUNNY_STREAM_API_KEY", { infer: true });
  }

  get bunnyStreamCdnHostname(): string | undefined {
    return this.configService.get("BUNNY_STREAM_CDN_HOSTNAME", { infer: true });
  }

  get bunnyStreamTokenKey(): string | undefined {
    return this.configService.get("BUNNY_STREAM_TOKEN_KEY", { infer: true });
  }

  get webhookSecret(): string | undefined {
    return this.configService.get("WEBHOOK_SECRET", { infer: true });
  }

  get razorpayKeyId(): string | undefined {
    return this.configService.get("RAZORPAY_KEY_ID", { infer: true });
  }

  get razorpayKeySecret(): string | undefined {
    return this.configService.get("RAZORPAY_KEY_SECRET", { infer: true });
  }

  get emailProvider(): "ses" | "sendgrid" {
    return this.configService.get("EMAIL_PROVIDER", { infer: true });
  }

  get emailFromName(): string {
    return this.configService.get("EMAIL_FROM_NAME", { infer: true });
  }

  get emailFromAddress(): string | undefined {
    return this.configService.get("EMAIL_FROM_ADDRESS", { infer: true });
  }

  get sendgridApiKey(): string | undefined {
    return this.configService.get("SENDGRID_API_KEY", { infer: true });
  }

  get redisUrl(): string | undefined {
    return this.configService.get("REDIS_URL", { infer: true });
  }

  get pexelsApiKey(): string | undefined {
    return this.configService.get("PEXELS_API_KEY", { infer: true });
  }

  isDevelopment(): boolean {
    return this.nodeEnv === "development";
  }

  isProduction(): boolean {
    return this.nodeEnv === "production";
  }

  isTest(): boolean {
    return this.nodeEnv === "test";
  }
}
