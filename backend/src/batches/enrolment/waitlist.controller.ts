import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { TransferStudentDto } from "../dto/transfer-student.dto";
import { TransferService } from "./transfer.service";
import { WaitlistService } from "./waitlist.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@ApiBearerAuth()
@Controller("batches")
export class WaitlistController {
  constructor(
    private readonly waitlist: WaitlistService,
    private readonly transfers: TransferService,
  ) {}

  @Authenticated()
  @ApiOperation({ summary: "Join the waitlist for a full batch" })
  @Post(":batchId/waitlist")
  join(@Param("batchId") batchId: string, @CurrentUser() user: AuthedUser) {
    return this.waitlist.join(batchId, user);
  }

  @Authenticated()
  @ApiOperation({ summary: "Give up your place on the waitlist" })
  @Delete(":batchId/waitlist")
  leave(@Param("batchId") batchId: string, @CurrentUser() user: AuthedUser) {
    return this.waitlist.leave(batchId, user);
  }

  @Authenticated()
  @ApiOperation({ summary: "Where you stand on this batch's waitlist" })
  @Get(":batchId/waitlist/me")
  myPlace(@Param("batchId") batchId: string, @CurrentUser() user: AuthedUser) {
    return this.waitlist.myPlace(batchId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Everyone waiting for a place, in order" })
  @Get(":batchId/waitlist")
  list(@Param("batchId") batchId: string, @CurrentUser() user: AuthedUser) {
    return this.waitlist.list(batchId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "How full this batch is and how many are waiting" })
  @Get(":batchId/capacity")
  capacity(@Param("batchId") batchId: string, @CurrentUser() user: AuthedUser) {
    return this.waitlist.capacityOf(batchId, user);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: "What moving this student would carry over and leave behind",
  })
  @Get(":batchId/enrollments/:userId/transfer-preview/:toBatchId")
  previewTransfer(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
    @Param("toBatchId") toBatchId: string,
  ) {
    return this.transfers.preview(batchId, userId, toBatchId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Move a student to another batch" })
  @Post(":batchId/enrollments/:userId/transfer")
  transfer(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
    @Body() dto: TransferStudentDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.transfers.transfer(batchId, userId, dto, user);
  }
}
