import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewPaymentDto {
  @ApiProperty({ required: false, description: 'Optional notes from reviewer' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
