import { Global, Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { JobsModule } from "../jobs/jobs.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiBatchService } from "./batch.service";
import { AiCostService } from "./cost.service";
import { LectureSummaryController } from "./lecture-summary.controller";
import { LectureSummaryService } from "./lecture-summary.service";
import { HttpModelProvider, MODEL_PROVIDER } from "./model-provider";

@Global()
@Module({
  imports: [DatabaseModule, JobsModule],
  controllers: [AiController, LectureSummaryController],
  providers: [
    { provide: MODEL_PROVIDER, useClass: HttpModelProvider },
    AiService,
    AiBatchService,
    AiCostService,
    LectureSummaryService,
  ],
  exports: [AiService, AiBatchService, AiCostService, MODEL_PROVIDER, LectureSummaryService],
})
export class AiModule {}
