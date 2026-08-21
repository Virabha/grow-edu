import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsInt, IsOptional, IsString, Min } from "class-validator";

export class AttachRecordingDto {
  @ApiProperty()
  @IsString()
  videoId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attendeeUserIds?: string[];
}
