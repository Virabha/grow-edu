import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { FilesModule } from "../files/files.module";
import { GradingModule } from "../assessment/grading/grading.module";
import { ProjectsModule } from "../projects/projects.module";
import { AiProjectFeedbackController } from "./ai-feedback.controller";
import { AiProjectFeedbackService } from "./ai-feedback.service";
import { HttpProjectCheckRunner, PROJECT_CHECK_RUNNER } from "./check-runner";
import { HttpProjectSimilarityProvider, PROJECT_SIMILARITY_PROVIDER } from "./similarity-provider";
import { ProjectReviewController } from "./project-review.controller";
import { ProjectReviewService } from "./project-review.service";

@Module({
  imports: [DatabaseModule, FilesModule, GradingModule, ProjectsModule],
  controllers: [ProjectReviewController, AiProjectFeedbackController],
  providers: [
    ProjectReviewService,
    AiProjectFeedbackService,
    { provide: PROJECT_CHECK_RUNNER, useClass: HttpProjectCheckRunner },
    { provide: PROJECT_SIMILARITY_PROVIDER, useClass: HttpProjectSimilarityProvider },
  ],
  exports: [ProjectReviewService],
})
export class ProjectReviewModule {}
