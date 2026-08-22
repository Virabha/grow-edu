import { Global, Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationTemplateService } from "./notification-templates.service";
import { NotificationTemplatesController } from "./notification-templates.controller";
import { BroadcastController } from "./broadcast.controller";
import { BroadcastService } from "./broadcast.service";
import { PushController } from "./push.controller";
import { HttpPushSender, PUSH_SENDER, PushService } from "./push.service";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { AppConfigModule } from "../config";

@Global()
@Module({
  imports: [DatabaseModule, EmailModule, AppConfigModule],
  controllers: [
    NotificationsController,
    NotificationTemplatesController,
    BroadcastController,
    PushController,
  ],
  providers: [
    NotificationsService,
    NotificationTemplateService,
    BroadcastService,
    PushService,
    { provide: PUSH_SENDER, useClass: HttpPushSender },
  ],
  exports: [NotificationsService, NotificationTemplateService, PushService],
})
export class NotificationsModule {}
