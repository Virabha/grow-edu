import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { CloneBatchDto } from "./clone-batch.dto";
import { CloneBatchService } from "./clone-batch.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@Controller("batches")
export class CloneBatchController {
  constructor(private readonly cloneBatch: CloneBatchService) {}

  @ApiOperation({ summary: "Clone a batch into a new draft (admin)" })
  @ApiBearerAuth()
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(":batchId/clone")
  clone(
    @Param("batchId") batchId: string,
    @Body() dto: CloneBatchDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.cloneBatch.clone(batchId, user.userId, dto.slug);
  }
}
