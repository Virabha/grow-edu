import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProblemController } from "./bank/problem.controller";
import { ProblemService } from "./bank/problem.service";
import { ValidationService } from "./bank/validation.service";
import {
  EXECUTION_PROVIDER,
  HttpExecutionProvider,
} from "./execution/execution-provider";
import { FrontendService } from "./runs/frontend.service";
import { RunController } from "./runs/run.controller";
import { RunService } from "./runs/run.service";

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [ProblemController, RunController],
  providers: [
    ProblemService,
    ValidationService,
    RunService,
    FrontendService,
    { provide: EXECUTION_PROVIDER, useClass: HttpExecutionProvider },
  ],
  exports: [ProblemService, RunService],
})
export class CodingModule {}
