import { Module } from "@nestjs/common";

import { AppCacheModule } from "../cache/cache.module";
import { CdnModule } from "../cdn/cdn.module";
import { CertificateTemplateModule } from "../certificate-template/certificate-template.module";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { FilesModule } from "../files/files.module";
import { PaymentModule } from "../payment/payment.module";
import { BatchAccessService } from "./access/batch-access.service";
import { BatchAssessmentController } from "./assessment/batch-assessment.controller";
import { BatchAssessmentService } from "./assessment/batch-assessment.service";
import { BatchMediaService } from "./batch-media.service";
import { BatchCatalogueController } from "./catalogue/batch-catalogue.controller";
import { BatchCatalogueService } from "./catalogue/batch-catalogue.service";
import { CertificateController } from "./certificates/certificate.controller";
import { CertificateService } from "./certificates/certificate.service";
import { BatchEngagementController } from "./engagement/batch-engagement.controller";
import { BatchEngagementService } from "./engagement/batch-engagement.service";
import { DoubtInboxController } from "./engagement/doubt-inbox.controller";
import { DoubtInboxService } from "./engagement/doubt-inbox.service";
import { BatchEnrolmentController } from "./enrolment/batch-enrolment.controller";
import { BatchEnrolmentService } from "./enrolment/batch-enrolment.service";
import { CloneBatchController } from "./lifecycle/clone-batch.controller";
import { CloneBatchService } from "./lifecycle/clone-batch.service";
import { BatchReportingController } from "./reporting/batch-reporting.controller";
import { BatchReportingService } from "./reporting/batch-reporting.service";
import { BatchSchedulingController } from "./scheduling/batch-scheduling.controller";
import { BatchSchedulingService } from "./scheduling/batch-scheduling.service";
import { TimetableService } from "./scheduling/timetable.service";

@Module({
  imports: [
    DatabaseModule,
    FilesModule,
    CdnModule,
    AppCacheModule,
    EmailModule,
    PaymentModule,
    CertificateTemplateModule,
  ],
  controllers: [
    BatchEnrolmentController,
    BatchReportingController,
    BatchSchedulingController,
    BatchAssessmentController,
    BatchEngagementController,
    DoubtInboxController,
    CertificateController,
    BatchCatalogueController,
    CloneBatchController,
  ],
  providers: [
    BatchAccessService,
    BatchMediaService,
    BatchCatalogueService,
    BatchEnrolmentService,
    BatchSchedulingService,
    TimetableService,
    BatchAssessmentService,
    BatchEngagementService,
    DoubtInboxService,
    BatchReportingService,
    CertificateService,
    CloneBatchService,
  ],
  exports: [BatchAccessService, BatchEnrolmentService, CertificateService],
})
export class BatchesModule {}
