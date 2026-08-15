import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterSocialLinksDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by platform name' })
  @IsOptional()
  @IsString()
  search?: string;
}
