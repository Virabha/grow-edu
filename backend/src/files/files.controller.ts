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
  ApiQuery,
  ApiConsumes,
} from "@nestjs/swagger";
import { Authenticated } from '../auth/decorators/authenticated.decorator';

@ApiTags("files")
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Authenticated()
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

  @Authenticated()
  @Get("storage/download-url")
  @ApiOperation({ summary: "Get CDN URL for a file" })
  @ApiQuery({ name: "key", type: "string", required: true, description: "Storage key of the file" })
  getDownloadUrl(@Query("key") key?: string) {
    if (typeof key !== "string" || key.trim() === "") {
      throw new BadRequestException("key is required");
    }
    const url = this.filesService.getDownloadUrl(key);
    return { url };
  }
}
