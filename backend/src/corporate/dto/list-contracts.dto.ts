import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListContractsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'Only contracts lapsing within this many days.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiringWithinDays?: number;
}
