import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterEnrollmentsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'COMPLETED', 'REVOKED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'REVOKED'])
  status?: string;

  @ApiPropertyOptional({ enum: ['SELF_PURCHASE', 'ADMIN_GRANT', 'COMPANY_ASSIGNMENT', 'FREE_COURSE'] })
  @IsOptional()
  @IsEnum(['SELF_PURCHASE', 'ADMIN_GRANT', 'COMPANY_ASSIGNMENT', 'FREE_COURSE'])
  source?: string;

  @ApiPropertyOptional({ description: 'Search by user name, email, or course title' })
  @IsOptional()
  @IsString()
  search?: string;
}
