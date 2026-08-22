import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import { CoverageService } from "./coverage.service";
import { InsightsController } from "./insights.controller";
import { QuestionPerformanceService } from "./question-performance.service";

@Module({
  imports: [DatabaseModule, TaxonomyModule],
  controllers: [InsightsController],
  providers: [CoverageService, QuestionPerformanceService],
  exports: [CoverageService, QuestionPerformanceService],
})
export class AssessmentInsightsModule {}
