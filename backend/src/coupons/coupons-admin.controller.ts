import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { FilterCouponsDto } from './dto/filter-coupons.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@ApiTags('admin/coupons')
@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class CouponsAdminController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  async create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all coupons with filters' })
  async findAll(@Query() query: FilterCouponsDto) {
    return this.couponsService.findAll({
      search: query.search,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':couponId')
  @ApiOperation({ summary: 'Get coupon details by ID' })
  @ApiResponse({ status: 200, description: 'Coupon details' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async findOne(@Param('couponId') couponId: string) {
    return this.couponsService.findOne(couponId);
  }

  @Put(':couponId')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  async update(
    @Param('couponId') couponId: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.update(couponId, dto);
  }

  @Patch(':couponId/activate')
  @ApiOperation({ summary: 'Activate a coupon' })
  @ApiResponse({ status: 200, description: 'Coupon activated' })
  async activate(@Param('couponId') couponId: string) {
    return this.couponsService.activate(couponId);
  }

  @Patch(':couponId/deactivate')
  @ApiOperation({ summary: 'Deactivate a coupon' })
  @ApiResponse({ status: 200, description: 'Coupon deactivated' })
  async deactivate(@Param('couponId') couponId: string) {
    return this.couponsService.deactivate(couponId);
  }

  @Delete(':couponId')
  @ApiOperation({ summary: 'Soft delete a coupon' })
  @ApiResponse({ status: 200, description: 'Coupon deleted' })
  async remove(@Param('couponId') couponId: string) {
    return this.couponsService.softDelete(couponId);
  }
}
