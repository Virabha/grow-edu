import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SettingsModule } from "../settings/settings.module";
import { BadgeService } from "./badge.service";
import { ReportCardService } from "./report-card.service";
import { StreakService } from "./streak.service";
import { StudyTimeController } from "./study-time.controller";
import { StudyTimeService } from "./study-time.service";

@Module({
  imports: [DatabaseModule, SettingsModule, NotificationsModule],
  controllers: [StudyTimeController],
  providers: [StudyTimeService, StreakService, BadgeService, ReportCardService],
  exports: [StudyTimeService, StreakService, BadgeService],
})
export class HabitsModule {}
