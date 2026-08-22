import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePageDto {
  @ApiProperty({ description: 'Page title', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ description: 'URL slug — auto-generated from title if omitted', maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  slug?: string;

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

  @ApiPropertyOptional({ description: 'JSON-LD structured data object (must contain @context and @type)' })
  @IsOptional()
  @IsObject()
  structuredData?: Record<string, unknown>;
}
