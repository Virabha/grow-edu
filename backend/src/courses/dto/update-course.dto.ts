import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, MinLength } from 'class-validator';

export class UpdateCourseDto {
  @ApiProperty({ description: 'Course title', required: false })
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'URL-friendly slug', required: false })
  @IsString()
  @MinLength(1)
  @IsOptional()
  slug?: string;

  @ApiProperty({ description: 'Course description', required: false })
  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Thumbnail S3 key or URL', required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ description: 'Course price', required: false })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'Compare-at price (strike-through)', required: false })
  @IsNumber()
  @IsOptional()
  compareAtPrice?: number;

  @ApiProperty({ description: 'Currency code', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Course status', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], required: false })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @ApiProperty({ description: 'Short description for cards', required: false })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiProperty({ description: 'Course level', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'], required: false })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'])
  @IsOptional()
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';

  @ApiProperty({ description: 'Course language', required: false })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ description: 'Category ID', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ description: 'Learning outcomes', required: false, type: [String] })
  @IsOptional()
  learningOutcomes?: string[];

  @ApiProperty({ description: 'Target audience', required: false, type: [String] })
  @IsOptional()
  targetAudience?: string[];

  @ApiProperty({ description: 'Course requirements', required: false, type: [String] })
  @IsOptional()
  requirements?: string[];
}

