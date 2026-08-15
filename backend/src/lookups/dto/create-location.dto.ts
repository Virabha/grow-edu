import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ example: 'India' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'IN', description: 'ISO country code' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @IsString()
  dialCode?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
