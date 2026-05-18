import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateApplicationStatusDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsIn(['NEW', 'REVIEWED', 'CONTACTED', 'ACCEPTED', 'REJECTED'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
