import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { PaymentService } from './payment.service';
import { UploadProofDto } from './dto/upload-proof.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { UpdateQRSettingsDto } from './dto/qr-settings.dto';
import { FilterPaymentsDto } from './dto/filter-payments.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Authenticated } from '../auth/decorators/authenticated.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Get public QR/bank settings (for checkout display)' })
  @Public()
  @Get('qr-settings')
  async getQRSettings() {
    return this.paymentService.getQRSettings();
  }

  @Authenticated()
  @ApiOperation({ summary: 'Upload payment proof (screenshot URL)' })
  @ApiResponse({ status: 200, description: 'Proof uploaded; awaiting admin review' })
  @Post(':paymentId/upload-proof')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async uploadProof(
    @Param('paymentId') paymentId: string,
    @Body() dto: UploadProofDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.uploadPaymentProof({
      paymentId: paymentId,
      userId: user.userId,
      proofUrl: dto.proofUrl,
      transactionId: dto.transactionId,
      payerName: dto.payerName,
    });
  }

  @Authenticated()
  @ApiOperation({ summary: 'Get my payment (learner)' })
  @Get('my/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyPayment(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.getMyPayment(paymentId, user.userId);
  }

  // ─── Admin ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all payments (admin)' })
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  async getAllPayments(@Query() query: FilterPaymentsDto) {
    return this.paymentService.getAllPayments({
      search: query.search,
      limit: query.limit ?? 20,
      page: query.page ?? 1,
      status: query.status,
      gateway: query.gateway,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  @ApiOperation({ summary: 'Pending QR-payment reviews (admin)' })
  @Get('pending-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  async getPendingReview(@Query() query: PaginationDto) {
    return this.paymentService.getPendingReviewPayments({
      limit: query.limit ?? 50,
      page: query.page ?? 1,
    });
  }

  @ApiOperation({ summary: 'Approve a manual-QR payment (admin)' })
  @Post(':paymentId/approve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  async approve(
    @Param('paymentId') paymentId: string,
    @Body() dto: ReviewPaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.approvePayment(paymentId, user.userId, dto.notes);
  }

  @ApiOperation({ summary: 'Reject a manual-QR payment (admin)' })
  @Post(':paymentId/reject')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  async reject(
    @Param('paymentId') paymentId: string,
    @Body() dto: ReviewPaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.rejectPayment(
      paymentId,
      user.userId,
      dto.notes || 'Rejected by admin',
    );
  }

  @ApiOperation({ summary: 'Update QR/bank settings (admin)' })
  @Patch('qr-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  async updateQRSettings(@Body() dto: UpdateQRSettingsDto) {
    return this.paymentService.updateQRSettings(dto);
  }

  @ApiOperation({ summary: 'Get a specific payment by ID (admin)' })
  @Get(':paymentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  async getPaymentById(@Param('paymentId') paymentId: string) {
    return this.paymentService.getPaymentById(paymentId);
  }
}
