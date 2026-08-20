import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

