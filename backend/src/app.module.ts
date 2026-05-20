import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { InstructorModule } from "./instructor/instructor.module";
import { AppConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { CoursesModule } from "./courses/courses.module";
import { CategoriesModule } from "./categories/categories.module";
import { EnrollmentsModule } from "./enrollments/enrollments.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
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
import { CouponsModule } from "./coupons/coupons.module";
import { CmsModule } from "./cms/cms.module";
import { TeacherApplicationsModule } from "./teacher-applications/teacher-applications.module";
import { ContactModule } from "./contact/contact.module";
import { SubscribeModule } from "./subscribe/subscribe.module";
import { AppCacheModule } from "./cache/cache.module";
import { BooksModule } from "./books/books.module";

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
    AnalyticsModule,
    ProgressModule,
    PaymentModule,
    StorageModule,
    LessonsModule,
    SectionsModule,
    InstructorModule,
    FilesModule,
    VideoEncodingModule,
    CdnModule,
    EmailModule,
    CouponsModule,
    CmsModule,
    TeacherApplicationsModule,
    ContactModule,
    SubscribeModule,
    BooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
