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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";
import { IsArray, IsString } from "class-validator";

class MarkReadDto {
  @IsArray()
  @IsString({ each: true })
  notificationIds!: string[];
}

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("notifications")
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: "List my notifications" })
  @Get()
  async list(
    @CurrentUser() user: AuthedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.notificationsService.listForUser(user.userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @ApiOperation({ summary: "Get unread count" })
  @Get("unread-count")
  async unreadCount(@CurrentUser() user: AuthedUser) {
    const count = await this.notificationsService.unreadCount(user.userId);
    return { count };
  }

  @ApiOperation({ summary: "Mark notifications as read" })
  @Patch("read")
  async markRead(@Body() dto: MarkReadDto, @CurrentUser() user: AuthedUser) {
    return this.notificationsService.markRead(user.userId, dto.notificationIds);
  }

  @ApiOperation({ summary: "Mark all as read" })
  @Post("mark-all-read")
  async markAllRead(@CurrentUser() user: AuthedUser) {
    return this.notificationsService.markAllRead(user.userId);
  }

  @ApiOperation({ summary: "Delete a notification" })
  @Delete(":notificationId")
  async remove(
    @Param("notificationId") notificationId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.notificationsService.delete(user.userId, notificationId);
  }
}
