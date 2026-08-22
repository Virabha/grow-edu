import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { EventCaptureController } from "./event-capture.controller";
import { EventCaptureService } from "./event-capture.service";
import { FunnelController } from "./funnel.controller";
import { FunnelService } from "./funnel.service";
import { InstructorComparisonController } from "./instructor-comparison.controller";
import { InstructorComparisonService } from "./instructor-comparison.service";
import { ReportBuilderController } from "./report-builder.controller";
import { ReportBuilderService } from "./report-builder.service";
import { RetentionController } from "./retention.controller";
import { RetentionService } from "./retention.service";
import { SavedReportsController } from "./saved-reports.controller";
import { SavedReportsService } from "./saved-reports.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    EventCaptureController,
    ReportBuilderController,
    SavedReportsController,
    FunnelController,
    RetentionController,
    InstructorComparisonController,
  ],
  providers: [
    EventCaptureService,
    ReportBuilderService,
    SavedReportsService,
    FunnelService,
    RetentionService,
    InstructorComparisonService,
  ],
})
export class ReportingModule {}
