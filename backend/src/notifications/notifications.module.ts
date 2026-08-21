import { Global, Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationTemplateService } from "./notification-templates.service";
import { NotificationTemplatesController } from "./notification-templates.controller";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { AppConfigModule } from "../config";

@Global()
@Module({
  imports: [DatabaseModule, EmailModule, AppConfigModule],
  controllers: [NotificationsController, NotificationTemplatesController],
  providers: [NotificationsService, NotificationTemplateService],
  exports: [NotificationsService, NotificationTemplateService],
})
export class NotificationsModule {}
