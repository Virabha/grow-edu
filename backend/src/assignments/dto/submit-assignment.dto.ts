import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl } from "class-validator";

export class SubmitAssignmentDto {
  @ApiProperty({ required: false, description: "File key from /files/upload (required when submissionType is FILE)" })
  @IsString()
  @IsOptional()
  fileKey?: string;

  @ApiProperty({ required: false, description: "Written answer (required when submissionType is TEXT)" })
  @IsString()
  @IsOptional()
  textAnswer?: string;

  @ApiProperty({ required: false, description: "External URL (required when submissionType is LINK)" })
  @IsUrl()
  @IsOptional()
  linkUrl?: string;
}
