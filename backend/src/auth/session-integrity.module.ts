import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AccountSuspensionService } from './account-suspension.service';
import { DeviceRevocationService } from './device-revocation.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [DeviceRevocationService, AccountSuspensionService],
  exports: [DeviceRevocationService, AccountSuspensionService],
})
export class SessionIntegrityModule {}
