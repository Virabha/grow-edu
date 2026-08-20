import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { InstructorModule } from "./instructor/instructor.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AdminResourcesModule } from "./admin-resources/admin-resources.module";
import { CertificateTemplateModule } from "./certificate-template/certificate-template.module";
import { BlogModule } from "./blog/blog.module";
import { QuizAttemptsModule } from "./quiz-attempts/quiz-attempts.module";
import { OrdersModule } from "./orders/orders.module";
import { SessionIntegrityModule } from "./auth/session-integrity.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { LiveSessionsModule } from "./live-sessions/live-sessions.module";
import { SettingsModule } from "./settings/settings.module";
import { AnnouncementsModule } from "./announcements/announcements.module";
import { AppConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { CoursesModule } from "./courses/courses.module";
import { CategoriesModule } from "./categories/categories.module";
import { EnrollmentsModule } from "./enrollments/enrollments.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { CorporateModule } from "./corporate/corporate.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ProgressModule } from "./progress/progress.module";
import { PaymentModule } from "./payment/payment.module";
import { StorageModule } from "./storage/storage.module";
import { LessonsModule } from "./lessons/lessons.module";
import { SectionsModule } from "./sections/sections.module";
import { FilesModule } from "./files/files.module";
import { VideoEncodingModule } from "./video-encoding/video-encoding.module";
import { CdnModule } from "./cdn/cdn.module";
import { EmailModule } from "./email/email.module";
import { CmsModule } from "./cms/cms.module";
import { AppCacheModule } from "./cache/cache.module";
import { BatchesModule } from "./batches/batches.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    AppConfigModule,
    AppCacheModule,
    DatabaseModule,
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1_000, limit: 10 },
      { name: "default", ttl: 60_000, limit: 120 },
      { name: "long", ttl: 60_000 * 60, limit: 2_000 },
    ]),
    AuthModule,
    CoursesModule,
    CategoriesModule,
    EnrollmentsModule,
    UsersModule,
    CompaniesModule,
    CorporateModule,
    AnalyticsModule,
    ProgressModule,
    PaymentModule,
    StorageModule,
    LessonsModule,
    SectionsModule,
    InstructorModule,
    DashboardModule,
    AdminResourcesModule,
    AnnouncementsModule,
    FilesModule,
    VideoEncodingModule,
    CdnModule,
    EmailModule,
    CmsModule,
    BatchesModule,
    NotificationsModule,
    CertificateTemplateModule,
    BlogModule,
    QuizAttemptsModule,
    OrdersModule,
    SessionIntegrityModule,
    AssignmentsModule,
    LiveSessionsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
