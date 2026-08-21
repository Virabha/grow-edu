import { Module } from "@nestjs/common";

import { AuditModule } from "../../audit/audit.module";
import { DatabaseModule } from "../../database/database.module";
import { GradingController, FeedbackRetrievalController } from "./grading.controller";
import { GradingService } from "./grading.service";
import { PlacementRubricController, RubricController } from "./rubric.controller";
import { RubricService } from "./rubric.service";
import { RegradeController, RegradeQueueController } from "./regrade.controller";
import { RegradeService } from "./regrade.service";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [
    RubricController,
    PlacementRubricController,
    GradingController,
    FeedbackRetrievalController,
    RegradeController,
    RegradeQueueController,
  ],
  providers: [RubricService, GradingService, RegradeService],
  exports: [RubricService, GradingService, RegradeService],
})
export class GradingModule {}
