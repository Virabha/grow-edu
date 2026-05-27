import { Global, Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { AppConfigModule } from "../config";

@Global()
@Module({
  imports: [DatabaseModule, EmailModule, AppConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
