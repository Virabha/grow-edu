import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class CreateRecurrenceSeriesDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({ enum: ["GOOGLE_MEET", "ZOOM", "JITSI", "YOUTUBE_LIVE", "CUSTOM_URL"] })
  @IsEnum(["GOOGLE_MEET", "ZOOM", "JITSI", "YOUTUBE_LIVE", "CUSTOM_URL"])
  liveProvider: "GOOGLE_MEET" | "ZOOM" | "JITSI" | "YOUTUBE_LIVE" | "CUSTOM_URL";

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  joinUrl?: string;

  @ApiProperty({
    type: [Number],
    description: "Days of week in UTC: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat",
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[];

  @ApiProperty({ description: 'UTC time in HH:MM format, e.g. "12:30" for 18:00 IST' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTimeUtc: string;

  @ApiProperty({ description: "Duration of each generated session in minutes" })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({ description: "ISO datetime from which to start generating sessions" })
  @IsDateString()
  windowStartAt: string;

  @ApiProperty({
    required: false,
    description: "ISO datetime at which to stop generating sessions; no limit if omitted",
  })
  @IsDateString()
  @IsOptional()
  windowEndAt?: string;

  @ApiProperty({
    required: false,
    description: "Days ahead of now to pre-materialise sessions (default 28)",
  })
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  lookAheadDays?: number;
}
