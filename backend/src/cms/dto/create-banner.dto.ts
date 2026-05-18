import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ default: 'rgba(0,0,0,0.4)' })
  @IsOptional()
  @IsString()
  overlayColor?: string;

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  overlayOpacity?: number;

  @ApiPropertyOptional({ default: '#ffffff' })
  @IsOptional()
  @IsString()
  textColor?: string;

  @ApiPropertyOptional({ default: 'left', enum: ['left', 'center', 'right'] })
  @IsOptional()
  @IsString()
  textAlign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaLink?: string;

  @ApiPropertyOptional({ default: 'primary', enum: ['primary', 'secondary', 'outline', 'ghost'] })
  @IsOptional()
  @IsString()
  ctaStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryCtaText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryCtaLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badgeText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badgeColor?: string;

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
