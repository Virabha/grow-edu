import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { AssessmentAttemptsModule } from "./attempts/attempts.module";
import { BulkGenerationService } from "./bank/bulk-generation.service";
import { QuestionBankController } from "./bank/question-bank.controller";
import { QuestionBankService } from "./bank/question-bank.service";
import { QuestionGenerationService } from "./bank/question-generation.service";
import { AssessmentInsightsModule } from "./insights/insights.module";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";

@Module({
  imports: [
    DatabaseModule,
    TaxonomyModule,
    AssessmentInsightsModule,
    AssessmentAttemptsModule,
  ],
  controllers: [QuestionBankController],
  providers: [QuestionBankService, QuestionGenerationService, BulkGenerationService],
  exports: [TaxonomyModule, QuestionBankService],
})
export class AssessmentModule {}
