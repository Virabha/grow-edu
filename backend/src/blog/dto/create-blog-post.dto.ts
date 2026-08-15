import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const POST_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
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
}
