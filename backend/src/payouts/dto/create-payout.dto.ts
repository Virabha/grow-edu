import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePayoutDto {
  @ApiProperty({ description: 'Requested withdrawal amount (must not exceed available balance)', example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1_000_000)
  amount: number;

  @ApiProperty({ description: 'Payout method (e.g. PayPal, Bank Transfer)', example: 'PayPal' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiPropertyOptional({ description: 'Account details / address for the payout', example: 'paypal@example.com' })
  @IsString()
  @IsOptional()
  accountDetails?: string;
}
