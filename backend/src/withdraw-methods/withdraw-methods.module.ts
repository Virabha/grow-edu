import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WithdrawMethodsController } from './withdraw-methods.controller';
import { WithdrawMethodsService } from './withdraw-methods.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WithdrawMethodsController],
  providers: [WithdrawMethodsService],
})
export class WithdrawMethodsModule {}
