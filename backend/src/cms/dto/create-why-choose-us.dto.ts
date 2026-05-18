import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWhyChooseUsDto {
  @ApiPropertyOptional()
  @IsString()
  iconName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconBg?: string;

  @ApiPropertyOptional()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
