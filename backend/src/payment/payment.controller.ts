import { Controller, Post, Get, Body, Param, UseGuards, Req, HttpCode, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateBulkPaymentDto } from './dto/create-bulk-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { EnrollFreeDto } from './dto/enroll-free.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Get all payments (Admin only)' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
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
    return await this.paymentService.getAllPayments({
      search,
      limit: limit ? parseInt(limit, 10) : 20,
      page: page ? parseInt(page, 10) : 1,
      status,
      gateway,
      dateFrom,
      dateTo,
    });
  }

  @ApiOperation({ summary: 'Get payment by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved' })
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN' as any)
  @ApiBearerAuth()
  async getPaymentById(@Param('id') id: string) {
    return await this.paymentService.getPaymentById(id);
  }

  @ApiOperation({ summary: 'Enroll in a free course or section' })
  @ApiResponse({ status: 201, description: 'Enrolled successfully' })
  @Post('enroll-free')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async enrollFree(
    @Body() dto: EnrollFreeDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.enrollFree({
      userId: user.userId,
      ...dto,
    });
  }

  @ApiOperation({ summary: 'Create a payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.paymentService.createCheckoutSession({
      userId: user.userId,
      itemType: dto.itemType,
      courseId: dto.courseId,
      sectionId: dto.sectionId,
      couponCode: dto.couponCode,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      metadata: dto.metadata,
    });

    return result;
  }

  @ApiOperation({ summary: 'Create a bulk payment for multiple cart items' })
  @ApiResponse({ status: 201, description: 'Bulk payment created successfully' })
  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createBulkPayment(
    @Body() dto: CreateBulkPaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.paymentService.createBulkCheckoutSession({
      userId: user.userId,
      cartItemIds: dto.cartItemIds,
      couponCode: dto.couponCode,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });

    return result;
  }

  @ApiOperation({ summary: 'Verify and complete payment (for client-side success page)' })
  @ApiResponse({ status: 200, description: 'Payment verified and completed' })
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async verifyPayment(
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    if (dto.sessionId) {
      return await this.paymentService.verifyAndCompletePaymentBySession(
        dto.sessionId,
        user.userId
      );
    } else if (dto.paymentIds && dto.paymentIds.length > 0) {
      return await this.paymentService.verifyAndCompleteBulkPayment(
        dto.paymentIds,
        user.userId
      );
    } else if (dto.paymentId) {
      return await this.paymentService.verifyAndCompletePayment(
        dto.paymentId,
        user.userId
      );
    }
    return { success: false, message: 'No payment ID provided' };
  }

  @ApiOperation({ summary: 'Verify payment webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @Post('webhook/stripe')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
  ) {
    const event = req.body as any;

    if (event?.type === 'checkout.session.completed') {
      const session = event.data?.object as {
        metadata?: Record<string, string>;
        id?: string;
        payment_intent?: string;
      };
      const metadata = session?.metadata || {};
      const isBulk = metadata.bulk === 'true';

      if (isBulk && metadata.paymentIds) {
        try {
          const paymentIds = JSON.parse(metadata.paymentIds) as string[];
          const userId = metadata.userId;

          // Controlled concurrency to reduce webhook timeout risk without changing behavior.
          // Marking completed and granting access remain idempotent at the service layer.
          const CONCURRENCY = 3;
          for (let i = 0; i < paymentIds.length; i += CONCURRENCY) {
            const batch = paymentIds.slice(i, i + CONCURRENCY);
            const results = await Promise.allSettled(
              batch.map(async (paymentId) => {
                const payment = await this.paymentService.markPaymentCompleted(
                  paymentId,
                  session.payment_intent
                );
                if (payment) {
                  await this.paymentService.grantAccessForPayment(
                    paymentId,
                    payment.itemType,
                    userId,
                    payment.courseId || undefined,
                    payment.sectionId || undefined
                  );
                }
              })
            );
            void results;
          }

          return { received: true, payments: paymentIds.length };
        } catch {}
      } else {
        const paymentId = metadata.paymentId;

        if (paymentId) {
          const payment = await this.paymentService.markPaymentCompleted(paymentId, session.payment_intent);
          await this.paymentService.grantAccessForPayment(
            paymentId,
            (metadata.itemType as 'COURSE' | 'SECTION') || 'COURSE',
            metadata.userId,
            metadata.courseId,
            metadata.sectionId,
          );
          return { received: true, payment };
        }
      }
    }

    return { received: true };
  }
}

