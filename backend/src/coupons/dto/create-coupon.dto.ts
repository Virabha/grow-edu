import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER2024', description: 'Unique coupon code' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Transform(({ value }) => value?.toUpperCase().trim())
  couponCode: string;

  @ApiProperty({ enum: DiscountType, example: 'PERCENTAGE' })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 20, description: 'Discount value (percentage or fixed amount)' })
  @IsNumber()
  @Min(0.01)
  discountValue: number;

  @ApiPropertyOptional({ example: 50, description: 'Maximum discount amount for percentage discounts' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Minimum purchase amount required' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @ApiProperty({ example: '2024-06-01T00:00:00Z' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ example: '2024-08-31T23:59:59Z' })
  @IsDateString()
  validTill: string;

  @ApiPropertyOptional({ example: 1000, description: 'Global usage limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ example: 1, description: 'Usage limit per user', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  usageLimitPerUser?: number;

  @ApiPropertyOptional({ description: 'Category IDs this coupon applies to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Course IDs this coupon applies to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseIds?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
