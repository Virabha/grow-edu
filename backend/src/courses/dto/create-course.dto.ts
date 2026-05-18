import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, MinLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiProperty({ description: 'Course description' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ description: 'Thumbnail S3 key or URL', required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ description: 'Course price' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Compare-at price (strike-through, optional)', required: false })
  @IsNumber()
  @IsOptional()
  compareAtPrice?: number;

  @ApiProperty({ description: 'Currency code', default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Course status', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @ApiProperty({ description: 'Short description for cards', required: false })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiProperty({ description: 'Course level', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'], default: 'BEGINNER' })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'])
  @IsOptional()
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';

  @ApiProperty({ description: 'Course language', default: 'English' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ description: 'Category ID' })
  @IsString()
  categoryId: string;
}

