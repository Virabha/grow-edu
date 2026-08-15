import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListOrdersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by status, or omit / pass "all" for no filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search by invoice number or item title' })
  @IsOptional()
  @IsString()
  search?: string;
}
