import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { StorageService } from "./storage.service";
import { GetUploadKeyDto } from "./dto/get-upload-key.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("storage")
@Controller("storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @ApiOperation({ summary: "Get upload key for storage" })
  @ApiResponse({ status: 200, description: "Upload key generated" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("upload-key")
  getUploadKey(
    @Body() body: GetUploadKeyDto,
    @CurrentUser() user: { userId: string },
  ) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const extension = body.fileName?.split(".").pop() || "jpg";

    let key: string;
    if (body.contentType?.startsWith("video/") || body.type === "lesson") {
      const cId = body.courseId || "uncategorized";
      const lId = body.lessonId || "general";
      key = `videos/${user.userId}/${cId}/${lId}/${timestamp}-${random}.${extension}`;
    } else if (body.courseId && body.type === "course") {
      key = `images/course/${user.userId}/${body.courseId}/${timestamp}-${random}.${extension}`;
    } else {
      key = `images/${body.type}/${user.userId}/${timestamp}-${random}.${extension}`;
    }

    return {
      key,
      uploadEndpoint: "/storage/upload",
    };
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload file to Bunny Storage" })
  @ApiResponse({ status: 200, description: "File uploaded" })
  async uploadFile(
    @UploadedFile() file: any,
    @Body() body: { key?: string },
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const key = body.key;
    if (!key) {
      throw new BadRequestException("Upload key is required");
    }

    await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    return { url: this.storageService.getCdnUrl(key), key };
  }
}
