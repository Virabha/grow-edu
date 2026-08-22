import { IsEnum, IsInt, IsNumber, IsOptional, IsDateString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class TrendFilterDto {
  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'day' })
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  period?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({ default: 30, type: Number })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    return isNaN(num) ? undefined : num;
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class TopBatchesFilterDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100, type: Number })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    return isNaN(num) ? undefined : num;
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
