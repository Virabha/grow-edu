import { IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty()
  @IsString()
  courseId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  order: number;

  @ApiPropertyOptional({ enum: ['INCLUDED', 'INDIVIDUAL', 'BOTH'], default: 'INCLUDED' })
  @IsOptional()
  @IsEnum(['INCLUDED', 'INDIVIDUAL', 'BOTH'])
  priceType?: 'INCLUDED' | 'INDIVIDUAL' | 'BOTH';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sectionPrice?: number;
}

export class UpdateSectionDto {
  @ApiProperty()
  @IsString()
  courseId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ enum: ['INCLUDED', 'INDIVIDUAL', 'BOTH'] })
  @IsOptional()
  @IsEnum(['INCLUDED', 'INDIVIDUAL', 'BOTH'])
  priceType?: 'INCLUDED' | 'INDIVIDUAL' | 'BOTH';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sectionPrice?: number;
}

export class ReorderSectionItemDto {
  @ApiProperty()
  @IsString()
  sectionId: string;

  @ApiProperty()
  @IsNumber()
  order: number;
}

export class ReorderSectionsDto {
  @ApiProperty()
  @IsString()
  courseId: string;

  @ApiProperty({ type: [ReorderSectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderSectionItemDto)
  modules: ReorderSectionItemDto[];
}
