import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { NotificationTemplateService } from "./notification-templates.service";
import { UpdateNotificationTemplateDto } from "./dto/update-notification-template.dto";

@ApiTags("notification-templates")
@Controller("notification-templates")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationTemplatesController {
  constructor(private readonly templateService: NotificationTemplateService) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "List all notification templates" })
  @Get()
  async listAll() {
    return this.templateService.findAll();
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Get a notification template by type" })
  @Get(":type")
  async getOne(@Param("type") type: string) {
    return this.templateService.findOne(type);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Update a notification template" })
  @Patch(":type")
  async update(
    @Param("type") type: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    await this.templateService.upsert(type, {
      subject: dto.subject,
      body: dto.body,
    });
    return this.templateService.findOne(type);
  }
}
