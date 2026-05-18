import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ValidateBulkCouponDto {
  @ApiProperty({ example: 'SUMMER2024' })
  @IsString()
  couponCode: string;

  @ApiProperty({ type: [String], description: 'Cart item IDs to validate coupon against' })
  @IsArray()
  @IsString({ each: true })
  cartItemIds: string[];
}

