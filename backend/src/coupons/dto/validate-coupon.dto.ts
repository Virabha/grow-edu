import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ example: 'SUMMER2024' })
  @IsString()
  couponCode: string;

  @ApiProperty({ example: 'course-uuid-123' })
  @IsString()
  courseId: string;

  @ApiPropertyOptional({ example: 'section-uuid-123' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ enum: ['COURSE', 'SECTION'], example: 'COURSE' })
  @IsEnum(['COURSE', 'SECTION'])
  itemType: 'COURSE' | 'SECTION';
}
