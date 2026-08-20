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
import { FilterNotificationsDto } from "./dto/filter-notifications.dto";
import { Authenticated } from '../auth/decorators/authenticated.decorator';

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

  @Authenticated()
  @ApiOperation({ summary: "List my notifications" })
  @Get()
  async list(
    @CurrentUser() user: AuthedUser,
    @Query() query: FilterNotificationsDto,
  ) {
    return this.notificationsService.listForUser(user.userId, {
      page: query.page,
      limit: query.limit,
    });
  }

  @Authenticated()
  @ApiOperation({ summary: "Get unread count" })
  @Get("unread-count")
  async unreadCount(@CurrentUser() user: AuthedUser) {
    const count = await this.notificationsService.unreadCount(user.userId);
    return { count };
  }

  @Authenticated()
  @ApiOperation({ summary: "Mark notifications as read" })
  @Patch("read")
  async markRead(@Body() dto: MarkReadDto, @CurrentUser() user: AuthedUser) {
    return this.notificationsService.markRead(user.userId, dto.notificationIds);
  }

  @Authenticated()
  @ApiOperation({ summary: "Mark all as read" })
  @Post("mark-all-read")
  async markAllRead(@CurrentUser() user: AuthedUser) {
    return this.notificationsService.markAllRead(user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Delete a notification" })
  @Delete(":notificationId")
  async remove(
    @Param("notificationId") notificationId: string,
    @CurrentUser() user: AuthedUser
  ) {
    return this.notificationsService.delete(user.userId, notificationId);
  }
}
