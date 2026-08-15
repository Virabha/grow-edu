import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PayoutsService } from './payouts.service';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { UpdatePayoutStatusDto } from './dto/update-payout-status.dto';

@ApiTags('payouts')
@Controller('payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  // ── Instructor endpoints — order matters: literal routes before :id ───────

  @ApiOperation({ summary: 'Get earnings summary (balance, courses sold, total payout)' })
  @ApiResponse({ status: 200 })
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Get('earnings')
  async getEarnings(@CurrentUser() user: { userId: string }) {
    return this.payoutsService.getEarnings(user.userId);
  }

  @ApiOperation({ summary: "Get instructor's own sales (completed payments)" })
  @ApiResponse({ status: 200 })
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Get('sales')
  async getSales(
    @CurrentUser() user: { userId: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.payoutsService.getSales(user.userId, pagination);
  }

  @ApiOperation({ summary: 'List payout history for the calling instructor' })
  @ApiResponse({ status: 200 })
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Get()
  async getPayoutHistory(
    @CurrentUser() user: { userId: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.payoutsService.getPayoutHistory(user.userId, pagination);
  }

  @ApiOperation({ summary: 'Request a payout (validated against available balance)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Amount exceeds available balance' })
  @Roles(UserRole.INSTRUCTOR)
  @Post()
  async createPayout(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreatePayoutDto,
  ) {
    return this.payoutsService.createPayout(user.userId, dto);
  }

  @ApiOperation({ summary: 'Cancel a PENDING payout request' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found or does not belong to caller' })
  @ApiResponse({ status: 400, description: 'Request is not in PENDING status' })
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @Delete(':id')
  async cancelPayout(
    @CurrentUser() user: { userId: string },
    @Param('id') payoutId: string,
  ) {
    return this.payoutsService.cancelPayout(payoutId, user.userId);
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Admin: list all payout requests' })
  @ApiResponse({ status: 200 })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get('admin')
  async adminGetAll(@Query() pagination: PaginationDto) {
    return this.payoutsService.adminGetAll(pagination);
  }

  @ApiOperation({ summary: 'Admin: approve, reject, or mark a payout as paid' })
  @ApiResponse({ status: 200 })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Patch('admin/:id/status')
  async adminUpdateStatus(
    @CurrentUser() user: { userId: string },
    @Param('id') payoutId: string,
    @Body() dto: UpdatePayoutStatusDto,
  ) {
    return this.payoutsService.adminUpdateStatus(payoutId, user.userId, dto);
  }
}
