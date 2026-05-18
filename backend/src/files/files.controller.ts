import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { FilesService } from "./files.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiConsumes,
} from "@nestjs/swagger";

@ApiTags("files")
@Controller("files")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("storage/upload-url")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a file to storage" })
  @ApiConsumes("multipart/form-data")
  async uploadFile(
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Body() body: { contentType?: string; folder?: string },
  ) {
    if (!file) {
      throw new BadRequestException(
        "File upload required. Send a multipart form with a 'file' field.",
      );
    }
    return this.filesService.uploadFile(
      file.buffer,
      file.mimetype,
      body.folder,
    );
  }

  @Get("storage/download-url")
  @ApiOperation({ summary: "Get CDN URL for a file" })
  @ApiQuery({ name: "key", type: "string", description: "Storage key of the file" })
  getDownloadUrl(@Query("key") key: string) {
    const url = this.filesService.getDownloadUrl(key);
    return { url };
  }
}
