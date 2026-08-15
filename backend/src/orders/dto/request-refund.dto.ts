import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RequestRefundDto {
  @ApiProperty({ description: 'Reason for the refund request (min 10 chars)' })
  @IsString()
  @MinLength(10)
  reason: string;
}
