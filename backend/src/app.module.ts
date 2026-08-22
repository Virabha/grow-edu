import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { AuthenticatedGuard } from "./auth/guards/authenticated.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { SelfOrAdminGuard } from "./auth/guards/self-or-admin.guard";
import { BatchAccessGuard } from "./batches/access/batch-access.guard";
import { InstructorModule } from "./instructor/instructor.module";
import { AdminResourcesModule } from "./admin-resources/admin-resources.module";
import { CertificateTemplateModule } from "./certificate-template/certificate-template.module";
import { BlogModule } from "./blog/blog.module";
import { OrdersModule } from "./orders/orders.module";
import { SessionIntegrityModule } from "./auth/session-integrity.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { SettingsModule } from "./settings/settings.module";
import { AppConfigModule } from "./config/config.module";
import { ClockModule } from "./common/clock";
import { JobsModule } from "./jobs/jobs.module";
import { AuditModule } from "./audit/audit.module";
import { RequestContextMiddleware } from "./audit/request-context.middleware";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { CorporateModule } from "./corporate/corporate.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { PaymentModule } from "./payment/payment.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { StorageModule } from "./storage/storage.module";
import { FilesModule } from "./files/files.module";
import { VideoEncodingModule } from "./video-encoding/video-encoding.module";
import { CdnModule } from "./cdn/cdn.module";
import { EmailModule } from "./email/email.module";
import { CmsModule } from "./cms/cms.module";
import { AppCacheModule } from "./cache/cache.module";
import { AssessmentModule } from "./assessment/assessment.module";
import { GroupsModule } from "./assessment/groups/groups.module";
import { ImportModule } from "./assessment/import/import.module";
import { IntegrityModule } from "./assessment/integrity/integrity.module";
import { GradingModule } from "./assessment/grading/grading.module";
import { TestsModule } from "./assessment/tests/tests.module";
import { PracticeModule } from "./assessment/practice/practice.module";
import { BatchesModule } from "./batches/batches.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ResultsModule } from "./assessment/results/results.module";
import { ReviewModule } from "./review/review.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { CommunityModule } from "./community/community.module";
import { HabitsModule } from "./habits/habits.module";
import { ParentsModule } from "./parents/parents.module";
import { MediaModule } from "./media/media.module";
import { StudyToolsModule } from "./study-tools/study-tools.module";
import { DiagnosticModule } from "./diagnostic/diagnostic.module";
import { EnvironmentsModule } from "./environments/environments.module";
import { PathsModule } from "./paths/paths.module";
import { ProjectsModule } from "./projects/projects.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { CodingModule } from "./coding/coding.module";
import { SkillsModule } from "./skills/skills.module";
import { CredentialsModule } from "./credentials/credentials.module";
import { ProjectReviewModule } from "./project-review/project-review.module";

@Module({
  imports: [
    AppConfigModule,
    ClockModule,
    JobsModule,
    AuditModule,
    AppCacheModule,
    DatabaseModule,
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1_000, limit: 10 },
      { name: "default", ttl: 60_000, limit: 120 },
      { name: "long", ttl: 60_000 * 60, limit: 2_000 },
    ]),
    AuthModule,
    CategoriesModule,
    UsersModule,
    CompaniesModule,
    CorporateModule,
    AnalyticsModule,
    PaymentModule,
    InvoicesModule,
    StorageModule,
    InstructorModule,
    AdminResourcesModule,
    FilesModule,
    VideoEncodingModule,
    CdnModule,
    EmailModule,
    CmsModule,
    BatchesModule,
    AssessmentModule,
    GroupsModule,
    ImportModule,
    IntegrityModule,
    TestsModule,
    GradingModule,
    PracticeModule,
    NotificationsModule,
    ResultsModule,
    ReviewModule,
    CertificateTemplateModule,
    DiscoveryModule,
    CommunityModule,
    BlogModule,
    OrdersModule,
    SessionIntegrityModule,
    AssignmentsModule,
    SettingsModule,
    HabitsModule,
    StudyToolsModule,
    MediaModule,
    ParentsModule,
    DiagnosticModule,
    CodingModule,
    PortfolioModule,
    ProjectsModule,
    PathsModule,
    SkillsModule,
    CredentialsModule,
    EnvironmentsModule,
    ProjectReviewModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AuthenticatedGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SelfOrAdminGuard },
    { provide: APP_GUARD, useClass: BatchAccessGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
