import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

const PROVIDERS = ['GOOGLE_MEET', 'ZOOM', 'JITSI', 'YOUTUBE_LIVE', 'CUSTOM_URL'] as const;
const STATUSES = ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED', 'COMPLETED'] as const;

export type LiveProvider = (typeof PROVIDERS)[number];
export type LiveStatus = (typeof STATUSES)[number];

export class CreateLiveSessionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsIn(PROVIDERS)
  provider: LiveProvider;

  @IsDateString()
  startsAt: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @ValidateIf((dto: CreateLiveSessionDto) => !!dto.joinUrl)
  @IsUrl()
  joinUrl?: string;

  @IsOptional()
  @IsString()
  meetingId?: string;

  @IsOptional()
  @IsString()
  meetingPasscode?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: LiveStatus;
}
