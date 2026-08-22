import { Injectable } from "@nestjs/common";
import { FilesService } from "../files/files.service";

@Injectable()
export class BatchMediaService {
  constructor(private readonly files: FilesService) {}

  url(key: string | null | undefined): string | null {
    if (!key) return null;
    if (key.startsWith("http")) return key;
    return this.files.getDownloadUrl(key);
  }
}
