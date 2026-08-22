import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [DatabaseModule, InvoicesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
