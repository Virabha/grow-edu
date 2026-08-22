import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProblemController } from "./bank/problem.controller";
import { ProblemService } from "./bank/problem.service";
import { ValidationService } from "./bank/validation.service";
import { AiCodeReviewController } from "./code-review.controller";
import { AiCodeReviewService } from "./code-review.service";
import {
  EXECUTION_PROVIDER,
  HttpExecutionProvider,
} from "./execution/execution-provider";
import { AiHintController } from "./hint.controller";
import { AiHintService } from "./hint.service";
import { FrontendService } from "./runs/frontend.service";
import { RunController } from "./runs/run.controller";
import { RunService } from "./runs/run.service";

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [ProblemController, RunController, AiCodeReviewController, AiHintController],
  providers: [
    ProblemService,
    ValidationService,
    RunService,
    FrontendService,
    AiCodeReviewService,
    AiHintService,
    { provide: EXECUTION_PROVIDER, useClass: HttpExecutionProvider },
  ],
  exports: [ProblemService, RunService],
})
export class CodingModule {}
