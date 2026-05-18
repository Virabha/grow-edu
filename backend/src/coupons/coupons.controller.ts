import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { ValidateBulkCouponDto } from './dto/validate-bulk-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a coupon code for checkout' })
  @ApiResponse({
    status: 200,
    description: 'Coupon validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        couponId: { type: 'string' },
        couponCode: { type: 'string' },
        discountType: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
        discountValue: { type: 'string' },
        originalAmount: { type: 'string' },
        discountAmount: { type: 'string' },
        finalAmount: { type: 'string' },
        reason: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
    @CurrentUser() user: { sub?: string; userId?: string },
  ) {
    const userId = user.userId || user.sub;
    return this.couponsService.validateCoupon(dto, userId as string);
  }

  @Post('validate-bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a coupon code against cart items (bulk)' })
  async validateBulkCoupon(
    @Body() dto: ValidateBulkCouponDto,
    @CurrentUser() user: { sub?: string; userId?: string },
  ) {
    const userId = user.userId || user.sub;
    return this.couponsService.validateCouponForCartItems(dto, userId as string);
  }
}
