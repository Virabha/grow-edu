import {
  Controller,
  Post,
  Get,
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
import { EnrollFreeDto } from './dto/enroll-free.dto';
import { InitiatePhonePeDto } from './phonepe/dto/initiate-phonepe.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private paymentService: PaymentService,
    private phonepeService: PhonePeService,
  ) {}

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

  @ApiOperation({ summary: 'Initiate a PhonePe payment and get the redirect URL' })
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
  @Public()
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

  @ApiOperation({ summary: 'Get a specific payment by ID (admin)' })
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiBearerAuth()
  async getPaymentById(@Param('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }
}
