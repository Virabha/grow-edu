import { Global, Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { AuditLogController } from "./audit-log.controller";
import { AuditLogService } from "./audit-log.service";

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
