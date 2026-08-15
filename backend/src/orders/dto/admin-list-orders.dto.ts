import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminListOrdersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by payment status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search by buyer email or name' })
  @IsOptional()
  @IsString()
  search?: string;
}
