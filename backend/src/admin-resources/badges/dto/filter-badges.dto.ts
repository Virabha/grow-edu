import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterBadgesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by badge name' })
  @IsOptional()
  @IsString()
  search?: string;
}
