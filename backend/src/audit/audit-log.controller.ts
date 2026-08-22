import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { AuditLogService } from "./audit-log.service";
import { SearchAuditLogDto } from "./dto/search-audit-log.dto";

@ApiTags("audit")
@ApiBearerAuth()
@Controller("audit-log")
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @ApiOperation({ summary: "Search the audit log (admin)" })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get()
  search(@Query() query: SearchAuditLogDto) {
    return this.auditLog.search({
      actorId: query.actorId,
      targetType: query.targetType,
      targetId: query.targetId,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
    });
  }
}
