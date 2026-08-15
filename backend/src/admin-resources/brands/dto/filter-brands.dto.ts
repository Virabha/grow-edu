import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterBrandsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by brand name' })
  @IsOptional()
  @IsString()
  search?: string;
}
