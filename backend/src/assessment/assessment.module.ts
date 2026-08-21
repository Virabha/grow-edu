import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { AssessmentAttemptsModule } from "./attempts/attempts.module";
import { QuestionBankController } from "./bank/question-bank.controller";
import { QuestionBankService } from "./bank/question-bank.service";
import { AssessmentInsightsModule } from "./insights/insights.module";
import { TaxonomyController } from "./taxonomy/taxonomy.controller";
import { TaxonomyService } from "./taxonomy/taxonomy.service";

@Module({
  imports: [DatabaseModule, AssessmentInsightsModule, AssessmentAttemptsModule],
  controllers: [TaxonomyController, QuestionBankController],
  providers: [TaxonomyService, QuestionBankService],
  exports: [TaxonomyService, QuestionBankService],
})
export class AssessmentModule {}
