import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const POST_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const;
export type BlogPostStatus = (typeof POST_STATUSES)[number];

export class CreateBlogPostDto {
  @ApiProperty({ description: 'Post title', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({ description: 'URL slug — auto-generated from title if omitted', maxLength: 520 })
  @IsOptional()
  @IsString()
  @MaxLength(520)
  slug?: string;

  @ApiPropertyOptional({ description: 'Short excerpt shown in listings', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  excerpt?: string;

  @ApiProperty({ description: 'Full post content (HTML or Markdown)' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Author display name', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  authorName?: string;

  @ApiPropertyOptional({ description: 'Cover image URL', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImageUrl?: string;

  @ApiPropertyOptional({ enum: POST_STATUSES, default: 'DRAFT' })
  @IsOptional()
  @IsIn(POST_STATUSES)
  status?: BlogPostStatus;

  @ApiPropertyOptional({ description: 'When to publish (ISO 8601) — used when status is SCHEDULED' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Category ID', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Post tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Meta title for SEO', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description for SEO', maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Canonical URL', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  canonicalUrl?: string;

  @ApiPropertyOptional({ description: 'Open Graph image URL', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ogImageUrl?: string;

  @ApiPropertyOptional({ description: 'JSON-LD structured data (must include @context and @type)' })
  @IsOptional()
  @IsObject()
  structuredData?: Record<string, unknown>;
}
