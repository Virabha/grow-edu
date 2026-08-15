import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AppConfigService } from "../config";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageBaseUrl: string;
  private readonly zoneName: string;
  private readonly apiKey: string;
  private readonly cdnHostname: string;

  constructor(private configService: AppConfigService) {
    this.zoneName = this.configService.bunnyStorageZoneName || "";
    this.apiKey = this.configService.bunnyStorageApiKey || "";
    this.cdnHostname = this.configService.bunnyCdnHostname || "";

    const region = this.configService.bunnyStorageRegion;
    // Bunny Storage regions: empty = Falkenstein, ny = New York, la = Los Angeles, sg = Singapore, etc.
    const regionPrefix = region ? `${region.toLowerCase()}.` : "";
    this.storageBaseUrl = `https://${regionPrefix}storage.bunnycdn.com`;
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    const url = `${this.storageBaseUrl}/${this.zoneName}/${key}`;

    if (!this.apiKey || !this.zoneName) {
      throw new ServiceUnavailableException(
        "File storage is not configured. Set BUNNY_STORAGE_API_KEY and BUNNY_STORAGE_ZONE_NAME.",
      );
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "PUT",
        headers: {
          AccessKey: this.apiKey,
          "Content-Type": contentType,
        },
        body: new Uint8Array(file),
      });
    } catch (cause) {
      this.logger.error(`Bunny Storage unreachable for ${key}`, cause);
      throw new ServiceUnavailableException(
        "Could not reach the file storage service. Please try again.",
      );
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Bunny Storage upload failed for ${key} (${response.status}): ${body}`,
      );
      if (response.status === 401 || response.status === 403) {
        throw new ServiceUnavailableException(
          "File storage rejected the credentials. Check BUNNY_STORAGE_API_KEY.",
        );
      }
      throw new ServiceUnavailableException(
        `File storage rejected the upload (${response.status}).`,
      );
    }

    this.logger.log(`Uploaded ${key} to Bunny Storage`);
    return key;
  }

  getCdnUrl(key: string): string {
    if (!this.cdnHostname) {
      throw new Error("BUNNY_CDN_HOSTNAME is not configured");
    }
    return `https://${this.cdnHostname}/${key}`;
  }

  async fileExists(key: string): Promise<boolean> {
    const url = `${this.storageBaseUrl}/${this.zoneName}/${key}`;

    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          AccessKey: this.apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const url = `${this.storageBaseUrl}/${this.zoneName}/${key}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        AccessKey: this.apiKey,
      },
    });

    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      this.logger.warn(`Bunny Storage delete failed (${response.status}): ${body}`);
    } else {
      this.logger.log(`Deleted ${key} from Bunny Storage`);
    }
  }

  generateImageKey(
    userId: string,
    type: "course" | "profile" | "lesson",
    id?: string,
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    if (id) {
      return `images/${type}/${userId}/${id}/${timestamp}-${random}.jpg`;
    }
    return `images/${type}/${userId}/${timestamp}-${random}.jpg`;
  }
}
