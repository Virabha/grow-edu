import { IsEnum, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentGateway } from '../payment.service';

export class CreateBulkPaymentDto {
  @ApiProperty({ enum: PaymentGateway, example: PaymentGateway.STRIPE_US })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ type: [String], description: 'Array of cart item IDs' })
  @IsArray()
  @IsString({ each: true })
  cartItemIds: string[];

  @ApiProperty({ required: false, description: 'Coupon code to apply across eligible cart items' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

