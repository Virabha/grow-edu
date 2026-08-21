import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { EmailModule } from '../email/email.module';
import { CorporateModule } from '../corporate/corporate.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [DatabaseModule, EmailModule, CorporateModule, InvoicesModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

