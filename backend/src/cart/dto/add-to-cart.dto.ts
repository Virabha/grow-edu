import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ enum: ['COURSE', 'SECTION'], default: 'COURSE' })
  @IsEnum(['COURSE', 'SECTION'])
  itemType: 'COURSE' | 'SECTION';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string;
}
