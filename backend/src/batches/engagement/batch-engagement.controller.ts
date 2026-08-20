import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { BatchManagerGuard } from "../access/batch-manager.guard";
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

  @ApiOperation({ summary: "List batch announcements (enrolled or staff)" })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/announcements")
  listAnnouncements(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.listAnnouncements(batchId, user);
  }

  @ApiOperation({ summary: "Post a batch announcement (admin or teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/announcements")
  createAnnouncement(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchAnnouncementDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.createAnnouncement(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Update an announcement (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/announcements/:announcementId")
  updateAnnouncement(
    @Param("batchId") batchId: string,
    @Param("announcementId") announcementId: string,
    @Body() dto: UpdateBatchAnnouncementDto,
  ) {
    return this.engagement.updateAnnouncement(batchId, announcementId, dto);
  }

  @ApiOperation({ summary: "Delete an announcement (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/announcements/:announcementId")
  deleteAnnouncement(
    @Param("batchId") batchId: string,
    @Param("announcementId") announcementId: string,
  ) {
    return this.engagement.deleteAnnouncement(batchId, announcementId);
  }

  @ApiOperation({ summary: "List PDF resources (enrolled or staff)" })
  @ApiQuery({
    name: "type",
    enum: ["DPP", "NOTES", "REFERENCE"],
    required: false,
  })
  @ApiQuery({ name: "subjectId", required: false })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/resources")
  listResources(
    @Param("batchId") batchId: string,
    @Query("type") type: "DPP" | "NOTES" | "REFERENCE" | undefined,
    @Query("subjectId") subjectId: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.listResources(batchId, user, { type, subjectId });
  }

  @ApiOperation({ summary: "Upload a PDF resource (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/resources")
  createResource(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchResourceDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.createResource(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Update a resource (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/resources/:resourceId")
  updateResource(
    @Param("batchId") batchId: string,
    @Param("resourceId") resourceId: string,
    @Body() dto: UpdateBatchResourceDto,
  ) {
    return this.engagement.updateResource(batchId, resourceId, dto);
  }

  @ApiOperation({ summary: "Delete a resource (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/resources/:resourceId")
  deleteResource(
    @Param("batchId") batchId: string,
    @Param("resourceId") resourceId: string,
  ) {
    return this.engagement.deleteResource(batchId, resourceId);
  }

  @ApiOperation({ summary: "List doubts in a batch" })
  @ApiQuery({ name: "mine", required: false, type: Boolean })
  @ApiQuery({ name: "status", required: false })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/doubts")
  listDoubts(
    @Param("batchId") batchId: string,
    @Query("mine") mine: string | undefined,
    @Query("status") status: string | undefined,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.listDoubts(batchId, user, {
      mine: mine === "true",
      status,
    });
  }

  @ApiOperation({ summary: "Post a doubt" })
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/doubts")
  createDoubt(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchDoubtDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.createDoubt(batchId, dto, user);
  }

  @ApiOperation({ summary: "Get a doubt with replies" })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/doubts/:doubtId")
  getDoubt(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.getDoubt(batchId, doubtId, user);
  }

  @ApiOperation({ summary: "Update a doubt (author or admin)" })
  @UseGuards(JwtAuthGuard)
  @Patch(":batchId/doubts/:doubtId")
  updateDoubt(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Body() dto: UpdateBatchDoubtDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.updateDoubt(batchId, doubtId, dto, user);
  }

  @ApiOperation({ summary: "Delete a doubt (author or admin)" })
  @UseGuards(JwtAuthGuard)
  @Delete(":batchId/doubts/:doubtId")
  deleteDoubt(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.deleteDoubt(batchId, doubtId, user);
  }

  @ApiOperation({ summary: "Reply to a doubt" })
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/doubts/:doubtId/replies")
  addReply(
    @Param("batchId") batchId: string,
    @Param("doubtId") doubtId: string,
    @Body() dto: CreateDoubtReplyDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.engagement.addDoubtReply(batchId, doubtId, dto, user);
  }

  @ApiOperation({ summary: "Delete a doubt reply" })
  @UseGuards(JwtAuthGuard)
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
