import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListBlogCategoriesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', enum: ['true', 'false'] })
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  isActive?: 'true' | 'false';
}
