import { Injectable } from "@nestjs/common";
import { StorageService } from "../storage/storage.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class FilesService {
  constructor(private storageService: StorageService) {}

  async uploadFile(
    file: Buffer,
    contentType: string,
    folder: string = "courses",
  ): Promise<{ url: string; key: string }> {
    const fileExtension = contentType.split("/")[1] || "bin";
    const key = `${folder}/${uuidv4()}.${fileExtension}`;

    await this.storageService.uploadFile(file, key, contentType);
    const url = this.storageService.getCdnUrl(key);
    return { url, key };
  }

  getDownloadUrl(key: string): string {
    if (key.startsWith("http")) return key;
    return this.storageService.getCdnUrl(key);
  }

  extractKey(urlOrKey: string): string {
    if (!urlOrKey.startsWith("http")) return urlOrKey;
    try {
      const url = new URL(urlOrKey);
      return url.pathname.startsWith("/")
        ? url.pathname.slice(1)
        : url.pathname;
    } catch {
      return urlOrKey;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const normalizedKey = this.extractKey(key);
    await this.storageService.deleteFile(normalizedKey);
  }
}
