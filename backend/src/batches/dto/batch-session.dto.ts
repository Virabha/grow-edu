import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

class SessionResourceDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  url: string;
}

export class CreateBatchSessionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ["LIVE", "RECORDING"] })
  @IsEnum(["LIVE", "RECORDING"])
  type: "LIVE" | "RECORDING";

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  teacherId?: string;

  // LIVE fields
  @ApiProperty({
    required: false,
    enum: ["GOOGLE_MEET", "ZOOM", "JITSI", "YOUTUBE_LIVE", "CUSTOM_URL"],
  })
  @IsEnum(["GOOGLE_MEET", "ZOOM", "JITSI", "YOUTUBE_LIVE", "CUSTOM_URL"])
  @IsOptional()
  liveProvider?: "GOOGLE_MEET" | "ZOOM" | "JITSI" | "YOUTUBE_LIVE" | "CUSTOM_URL";

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  joinUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  meetingId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  meetingPasscode?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  scheduledStartAt?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  scheduledEndAt?: string;

  // RECORDING fields
  @ApiProperty({ required: false, description: "Bunny Stream video ID" })
  @IsString()
  @IsOptional()
  recordingVideoId?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  recordingDurationSeconds?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  recordingThumbnail?: string;

  @ApiProperty({ type: [SessionResourceDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionResourceDto)
  @IsOptional()
  resources?: SessionResourceDto[];
}

export class UpdateBatchSessionDto extends PartialType(CreateBatchSessionDto) {}
