import { IsEnum, IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentGateway } from '../payment.service';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentGateway, example: PaymentGateway.RAZORPAY })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ enum: ['COURSE', 'SECTION'] })
  @IsEnum(['COURSE', 'SECTION'])
  itemType: 'COURSE' | 'SECTION';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ required: false, description: 'Coupon code to apply (optional)' })
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

  @ApiProperty({ example: { courseId: 'course-id', userId: 'user-id' }, required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

