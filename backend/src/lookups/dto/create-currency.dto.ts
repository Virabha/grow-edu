import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'US Dollar' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: '$' })
  @IsString()
  @MinLength(1)
  symbol: string;

  @ApiProperty({ example: 0.012, description: 'Exchange rate against INR' })
  @IsNumber()
  rate: number;

  @ApiPropertyOptional({ enum: ['before', 'after'], default: 'before' })
  @IsOptional()
  @IsIn(['before', 'after'])
  position?: 'before' | 'after';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
