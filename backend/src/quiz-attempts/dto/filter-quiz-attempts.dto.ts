import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterQuizAttemptsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by batch ID (returned as courseId in each attempt)' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ enum: ['all', 'passed', 'failed'] })
  @IsOptional()
  @IsEnum(['all', 'passed', 'failed'])
  result?: 'all' | 'passed' | 'failed';
}
