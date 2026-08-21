import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { CorporateAdminController } from './corporate-admin.controller';
import { CorporateAdminService } from './corporate-admin.service';
import { JoinController } from './join.controller';
import { JoinLinksService } from './join-links.service';
import { RosterService } from './roster.service';
import { SeatsService } from './seats.service';
import { PerTokenThrottlerGuard } from '../auth/guards/per-token-throttler.guard';
import { SubGroupsService } from './sub-groups.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    ContractsController,
    CorporateAdminController,
    JoinController,
  ],
  providers: [
    ContractsService,
    CorporateAdminService,
    JoinLinksService,
    RosterService,
    SeatsService,
    PerTokenThrottlerGuard,
    SubGroupsService,
  ],
  exports: [ContractsService],
})
export class CorporateModule {}
