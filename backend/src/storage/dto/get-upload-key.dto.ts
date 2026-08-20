import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const UPLOAD_TYPES = [
  "batch",
  "profile",
  "lesson",
  "payment-proofs",
  "qr",
  "thumbnails",
  "documents",
  "misc",
] as const;

export type UploadType = (typeof UPLOAD_TYPES)[number];

export class GetUploadKeyDto {
  @ApiProperty({ enum: UPLOAD_TYPES })
  @IsEnum(UPLOAD_TYPES)
  type: UploadType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentType?: string;
}
