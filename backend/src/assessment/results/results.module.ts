import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { CohortStatsService } from "./cohort-stats.service";
import { ResultController } from "./result.controller";
import { ResultService } from "./result.service";
import { WeakTopicService } from "./weak-topic.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ResultController],
  providers: [CohortStatsService, ResultService, WeakTopicService],
  exports: [CohortStatsService, ResultService, WeakTopicService],
})
export class ResultsModule {}
