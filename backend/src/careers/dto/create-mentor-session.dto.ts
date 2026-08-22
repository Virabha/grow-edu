import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsIn,
} from "class-validator";

export type LiveProvider =
  | "GOOGLE_MEET"
  | "ZOOM"
  | "JITSI"
  | "YOUTUBE_LIVE"
  | "CUSTOM_URL";

export class CreateMentorSessionDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  pathId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  scheduledStartAt: string;

  @IsDateString()
  scheduledEndAt: string;

  @IsOptional()
  @IsString()
  joinUrl?: string;

  @IsOptional()
  @IsIn(["GOOGLE_MEET", "ZOOM", "JITSI", "YOUTUBE_LIVE", "CUSTOM_URL"])
  liveProvider?: LiveProvider;
}
