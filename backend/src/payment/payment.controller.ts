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
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EnrollFreeDto } from './dto/enroll-free.dto';
import { UploadProofDto } from './dto/upload-proof.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { UpdateQRSettingsDto } from './dto/qr-settings.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // ─── Public-ish (authenticated learner) ─────────────────────────────

  @ApiOperation({ summary: 'Get public QR/bank settings (for checkout display)' })
  @Get('qr-settings')
  async getQRSettings() {
    return this.paymentService.getQRSettings();
  }

  @ApiOperation({ summary: 'Enroll in a free course/section' })
  @ApiResponse({ status: 201, description: 'Enrolled successfully' })
  @Post('enroll-free')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async enrollFree(
    @Body() dto: EnrollFreeDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.enrollFree({ userId: user.userId, ...dto });
  }

  @ApiOperation({ summary: 'Create a manual-QR payment (returns QR/bank details)' })
  @ApiResponse({ status: 201, description: 'Payment created — awaiting proof upload' })
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.createManualQRPayment({
      userId: user.userId,
      itemType: dto.itemType,
      courseId: dto.courseId,
      sectionId: dto.sectionId,
      couponCode: dto.couponCode,
    });
  }

  @ApiOperation({ summary: 'Upload payment proof (screenshot URL)' })
  @ApiResponse({ status: 200, description: 'Proof uploaded; awaiting admin review' })
  @Post(':id/upload-proof')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async uploadProof(
    @Param('id') id: string,
    @Body() dto: UploadProofDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.uploadPaymentProof({
      paymentId: id,
      userId: user.userId,
      proofUrl: dto.proofUrl,
    });
  }

  @ApiOperation({ summary: 'Get my payment (learner)' })
  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyPayment(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.getMyPayment(id, user.userId);
  }

  // ─── Admin ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all payments (admin)' })
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN' as any)
  @ApiBearerAuth()
  async getAllPayments(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('gateway') gateway?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.paymentService.getAllPayments({
      search,
      limit: limit ? parseInt(limit, 10) : 20,
      page: page ? parseInt(page, 10) : 1,
      status,
      gateway,
      dateFrom,
      dateTo,
    });
  }

  @ApiOperation({ summary: 'Pending QR-payment reviews (admin)' })
  @Get('pending-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN' as any)
  @ApiBearerAuth()
  async getPendingReview(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.paymentService.getPendingReviewPayments({
      limit: limit ? parseInt(limit, 10) : 50,
      page: page ? parseInt(page, 10) : 1,
    });
  }

  @ApiOperation({ summary: 'Approve a manual-QR payment (admin)' })
  @Post(':id/approve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN' as any)
  @ApiBearerAuth()
  async approve(
    @Param('id') id: string,
    @Body() dto: ReviewPaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.approvePayment(id, user.userId, dto.notes);
  }

  @ApiOperation({ summary: 'Reject a manual-QR payment (admin)' })
  @Post(':id/reject')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN' as any)
  @ApiBearerAuth()
  async reject(
    @Param('id') id: string,
    @Body() dto: ReviewPaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.rejectPayment(
      id,
      user.userId,
      dto.notes || 'Rejected by admin',
    );
  }

  @ApiOperation({ summary: 'Update QR/bank settings (admin)' })
  @Patch('qr-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN' as any)
  @ApiBearerAuth()
  async updateQRSettings(@Body() dto: UpdateQRSettingsDto) {
    return this.paymentService.updateQRSettings(dto);
  }

  @ApiOperation({ summary: 'Get a specific payment by ID (admin)' })
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN' as any)
  @ApiBearerAuth()
  async getPaymentById(@Param('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }
}
