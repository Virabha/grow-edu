import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { AiCostQueryDto } from "./dto/ai-cost.dto";
import { AiCostService } from "./cost.service";

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(private readonly cost: AiCostService) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Model cost by feature and organisation" })
  @Get("cost")
  async breakdown(@Query() query: AiCostQueryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 3_600_000);
    const rows = await this.cost.breakdown({ from, to });
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      rows,
      totals: rows.reduce(
        (sum, row) => ({
          calls: sum.calls + row.calls,
          failures: sum.failures + row.failures,
          inputTokens: sum.inputTokens + row.inputTokens,
          outputTokens: sum.outputTokens + row.outputTokens,
          cacheReadTokens: sum.cacheReadTokens + row.cacheReadTokens,
          cacheWriteTokens: sum.cacheWriteTokens + row.cacheWriteTokens,
        }),
        {
          calls: 0,
          failures: 0,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
      ),
    };
  }
}
