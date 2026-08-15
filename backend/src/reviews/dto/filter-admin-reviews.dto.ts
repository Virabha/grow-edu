import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterAdminReviewsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'PUBLISHED', 'REJECTED'] })
  @IsOptional()
  @IsIn(['PENDING', 'PUBLISHED', 'REJECTED'])
  status?: 'PENDING' | 'PUBLISHED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;
}
