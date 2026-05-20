import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { EmailModule } from '../email/email.module';
import { CouponsModule } from '../coupons/coupons.module';
import { PhonePeService } from './phonepe/phonepe.service';

@Module({
  imports: [DatabaseModule, EmailModule, CouponsModule],
  controllers: [PaymentController],
  providers: [PaymentService, PhonePeService],
  exports: [PaymentService, PhonePeService],
})
export class PaymentModule {}

