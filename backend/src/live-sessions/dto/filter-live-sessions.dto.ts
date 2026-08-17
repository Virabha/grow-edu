import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

const PROVIDER_FILTER = [
  'all',
  'GOOGLE_MEET',
  'ZOOM',
  'JITSI',
  'YOUTUBE_LIVE',
  'CUSTOM_URL',
] as const;

export class FilterLiveSessionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsIn(PROVIDER_FILTER)
  provider: string = 'all';
}
