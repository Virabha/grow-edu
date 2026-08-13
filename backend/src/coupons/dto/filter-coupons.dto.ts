import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterCouponsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  /** 'true' | 'false' — parsed to boolean by the controller */
  @ApiPropertyOptional({ type: String, example: 'true' })
  @IsOptional()
  @IsString()
  isActive?: string;
}
