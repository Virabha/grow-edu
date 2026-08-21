import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import {
  CreateBatchAnnouncementDto,
  UpdateBatchAnnouncementDto,
} from "../dto/batch-announcement.dto";
import {
  CreateBatchDoubtDto,
  CreateDoubtReplyDto,
  UpdateBatchDoubtDto,
} from "../dto/batch-doubt.dto";
import {
  CreateBatchResourceDto,
  UpdateBatchResourceDto,
} from "../dto/batch-resource.dto";
import { BatchEngagementService } from "./batch-engagement.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@ApiBearerAuth()
@Controller("batches")
export class BatchEngagementController {
  constructor(private readonly engagement: BatchEngagementService) {}

  @BatchAccess("READ")
  @ApiOperation({ summary: "List batch announcements (enrolled or staff)" })
  @Get(":batchId/announcements")
  listAnnouncements(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.listAnnouncements(batchId, user);
  }

  @BatchAccess("MANAGE")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: "Post a batch announcement (admin or teacher)" })
  @Post(":batchId/announcements")
  createAnnouncement(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchAnnouncementDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.createAnnouncement(batchId, dto, user.userId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Update an announcement (admin or batch teacher)" })
  @Patch(":batchId/announcements/:announcementId")
  updateAnnouncement(
    @Param("batchId") batchId: string,
    @Param("announcementId") announcementId: string,
    @Body() dto: UpdateBatchAnnouncementDto,
  ) {
    return this.engagement.updateAnnouncement(batchId, announcementId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Delete an announcement (admin or batch teacher)" })
  @Delete(":batchId/announcements/:announcementId")
  deleteAnnouncement(
    @Param("batchId") batchId: string,
    @Param("announcementId") announcementId: string,
  ) {
    return this.engagement.deleteAnnouncement(batchId, announcementId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Browse the resource library grouped by subject and type" })
  @Get(":batchId/resources/library")
  listResourceLibrary(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.listResourceLibrary(batchId, user);
  }

  @ApiOperation({ summary: "List PDF resources (enrolled or staff)" })
  @ApiQuery({
    name: "type",
    enum: ["DPP", "NOTES", "REFERENCE"],
    required: false,
  })
  @BatchAccess("READ")
  @ApiQuery({ name: "subjectId", required: false })
  @Get(":batchId/resources")
  listResources(
    @Param("batchId") batchId: string,
    @Query("type") type: "DPP" | "NOTES" | "REFERENCE" | undefined,
    @Query("subjectId") subjectId: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.listResources(batchId, user, { type, subjectId });
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Upload a PDF resource (admin or batch teacher)" })
  @Post(":batchId/resources")
  createResource(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchResourceDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.createResource(batchId, dto, user.userId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Update a resource (admin or batch teacher)" })
  @Patch(":batchId/resources/:resourceId")
  updateResource(
    @Param("batchId") batchId: string,
    @Param("resourceId") resourceId: string,
    @Body() dto: UpdateBatchResourceDto,
  ) {
    return this.engagement.updateResource(batchId, resourceId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Delete a resource (admin or batch teacher)" })
  @Delete(":batchId/resources/:resourceId")
  deleteResource(
    @Param("batchId") batchId: string,
    @Param("resourceId") resourceId: string,
  ) {
    return this.engagement.deleteResource(batchId, resourceId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "List doubts in a batch" })
  @ApiQuery({ name: "mine", required: false, type: Boolean })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "anchorId", required: false })
  @Get(":batchId/doubts")
  listDoubts(
    @Param("batchId") batchId: string,
    @Query("mine") mine: string | undefined,
    @Query("status") status: string | undefined,
    @Query("anchorId") anchorId: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.listDoubts(batchId, user, {
      mine: mine === "true",
      status,
      anchorId,
    });
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Post a doubt" })
  @Post(":batchId/doubts")
  createDoubt(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchDoubtDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.createDoubt(batchId, dto, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Get a doubt with replies" })
  @Get(":batchId/doubts/:doubtId")
  getDoubt(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.getDoubt(batchId, doubtId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Update a doubt (author or admin)" })
  @Patch(":batchId/doubts/:doubtId")
  updateDoubt(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Body() dto: UpdateBatchDoubtDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.updateDoubt(batchId, doubtId, dto, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Delete a doubt (author or admin)" })
  @Delete(":batchId/doubts/:doubtId")
  deleteDoubt(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.deleteDoubt(batchId, doubtId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Reply to a doubt" })
  @Post(":batchId/doubts/:doubtId/replies")
  addReply(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Body() dto: CreateDoubtReplyDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.addDoubtReply(batchId, doubtId, dto, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Delete a doubt reply" })
  @Delete(":batchId/doubts/:doubtId/replies/:replyId")
  deleteReply(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Param("replyId") replyId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.deleteDoubtReply(batchId, doubtId, replyId, user);
  }
}
