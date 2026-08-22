import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { AssignDoubtDto, PromoteDoubtDto } from "../dto/doubt-inbox.dto";
import { DoubtInboxService } from "./doubt-inbox.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("doubts")
@ApiBearerAuth()
@Controller()
export class DoubtInboxController {
  constructor(private readonly inbox: DoubtInboxService) {}

  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: "Every unanswered doubt across the batches you teach, oldest first",
  })
  @Get("instructor/doubts")
  mine(@CurrentUser() user: AuthedUser) {
    return this.inbox.inbox(user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Send a doubt to a colleague on the same batch" })
  @Post("batches/:batchId/doubts/:doubtId/assign")
  assign(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Body() dto: AssignDoubtDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.inbox.assign(batchId, doubtId, dto, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Publish an answer to the whole batch" })
  @Post("batches/:batchId/doubts/:doubtId/promote")
  promote(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Body() dto: PromoteDoubtDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.inbox.promote(batchId, doubtId, dto, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Take a published answer back off the batch" })
  @Delete("batches/:batchId/doubts/:doubtId/promote")
  unpromote(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.inbox.unpromote(batchId, doubtId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Browse the answers published to this batch" })
  @Get("batches/:batchId/answers")
  answers(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.inbox.listPromoted(batchId, user);
  }
}
