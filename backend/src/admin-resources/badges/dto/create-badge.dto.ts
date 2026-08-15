import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsIn, IsOptional, IsString, Min, MinLength } from 'class-validator';

/** Must mirror the badgeCriteriaEnum values in schema.ts. */
export const BADGE_CRITERIA_TYPES = ['RATING', 'ENROLMENTS', 'COURSES', 'MANUAL'] as const;
export type BadgeCriteriaType = (typeof BADGE_CRITERIA_TYPES)[number];

export class CreateBadgeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colour?: string;

  @ApiProperty({ enum: BADGE_CRITERIA_TYPES })
  @IsIn([...BADGE_CRITERIA_TYPES])
  criteriaType: BadgeCriteriaType;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  criteriaValue?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
