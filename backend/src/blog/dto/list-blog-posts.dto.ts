import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

const POST_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

export class ListBlogPostsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: POST_STATUSES })
  @IsOptional()
  @IsIn(POST_STATUSES)
  status?: (typeof POST_STATUSES)[number];
}
