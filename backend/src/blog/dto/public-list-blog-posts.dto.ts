import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class PublicListBlogPostsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by category slug', maxLength: 220 })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  categorySlug?: string;
}
