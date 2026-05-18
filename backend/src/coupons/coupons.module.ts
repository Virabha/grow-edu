import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller';
import { CouponsAdminController } from './coupons-admin.controller';
import { CouponsService } from './coupons.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CouponsController, CouponsAdminController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
