import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnrollmentDto {
  @ApiProperty({ example: 'course-id-here' })
  @IsString()
  courseId: string;

  @ApiPropertyOptional({ example: 'user-id-here' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'company-id-here' })
  @IsOptional()
  @IsString()
  companyId?: string;
}

