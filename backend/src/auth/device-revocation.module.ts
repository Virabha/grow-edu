import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { DeviceRevocationService } from './device-revocation.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [DeviceRevocationService],
  exports: [DeviceRevocationService],
})
export class DeviceRevocationModule {}
