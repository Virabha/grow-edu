import { Injectable, Logger } from "@nestjs/common";
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

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        AccessKey: this.apiKey,
        "Content-Type": contentType,
      },
      body: new Uint8Array(file),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Bunny Storage upload failed (${response.status}): ${body}`,
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
