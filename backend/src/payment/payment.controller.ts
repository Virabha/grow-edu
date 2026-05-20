import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Headers,
  Param,
  UseGuards,
  HttpCode,
  Query,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentService } from './payment.service';
import { PhonePeService } from './phonepe/phonepe.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EnrollFreeDto } from './dto/enroll-free.dto';
import { UploadProofDto } from './dto/upload-proof.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { UpdateQRSettingsDto } from './dto/qr-settings.dto';
import { InitiatePhonePeDto } from './phonepe/dto/initiate-phonepe.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private paymentService: PaymentService,
    private phonepeService: PhonePeService,
  ) {}

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
      transactionId: dto.transactionId,
      payerName: dto.payerName,
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

  // ─── PhonePe ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Initiate a PhonePe payment and get the redirect URL' })
  @ApiResponse({ status: 201, description: 'PhonePe payment initiated' })
  @Post('phonepe/initiate')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiBearerAuth()
  async initiatePhonePe(
    @Body() dto: InitiatePhonePeDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.initiatePhonePePayment({
      userId: user.userId,
      itemType: dto.itemType,
      courseId: dto.courseId,
      sectionId: dto.sectionId,
      couponCode: dto.couponCode,
    });
  }

  @ApiOperation({ summary: 'Poll PhonePe payment status (learner, own payment only)' })
  @Get('phonepe/status/:paymentId')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiBearerAuth()
  async getPhonePeStatus(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.getPhonePeStatus(paymentId, user.userId);
  }

  @ApiOperation({ summary: 'PhonePe S2S callback (public, signature-verified)' })
  @Post('phonepe/webhook')
  @HttpCode(200)
  @SkipThrottle()
  async phonepeWebhook(
    @Req() req: Request,
    @Headers('x-verify') xVerify: string | undefined,
  ) {
    const rawBody =
      typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {});

    this.phonepeService.verifyCallbackSignature(rawBody, xVerify);

    type Envelope = { response?: string };
    const parsed: Envelope =
      typeof req.body === 'object' && req.body !== null
        ? (req.body as Envelope)
        : ((): Envelope => {
            try {
              return JSON.parse(rawBody) as Envelope;
            } catch {
              return {};
            }
          })();

    const encoded = parsed.response;
    if (!encoded) {
      return { received: true, processed: false, reason: 'Missing response' };
    }

    let decoded: { data?: { merchantTransactionId?: string } } = {};
    try {
      decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    } catch (err) {
      this.logger.warn(
        `PhonePe webhook decode failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return { received: true, processed: false, reason: 'Invalid envelope' };
    }

    const merchantTransactionId = decoded.data?.merchantTransactionId;
    if (!merchantTransactionId) {
      return { received: true, processed: false, reason: 'Missing transaction id' };
    }

    try {
      const result = await this.paymentService.finalizePhonePePayment(
        merchantTransactionId,
      );
      return { received: true, processed: true, status: result.status };
    } catch (err) {
      this.logger.error(
        `PhonePe webhook finalize failed for ${merchantTransactionId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return { received: true, processed: false };
    }
  }

  // ─── Admin ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all payments (admin)' })
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
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
  @Roles('PLATFORM_ADMIN')
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
  @Roles('PLATFORM_ADMIN')
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
  @Roles('PLATFORM_ADMIN')
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
  @Roles('PLATFORM_ADMIN')
  @ApiBearerAuth()
  async updateQRSettings(@Body() dto: UpdateQRSettingsDto) {
    return this.paymentService.updateQRSettings(dto);
  }

  @ApiOperation({ summary: 'Get a specific payment by ID (admin)' })
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiBearerAuth()
  async getPaymentById(@Param('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }
}
