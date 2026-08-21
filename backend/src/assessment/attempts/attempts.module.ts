import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AttemptController } from "./attempt.controller";
import { AttemptService } from "./attempt.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AttemptController],
  providers: [AttemptService],
  exports: [AttemptService],
})
export class AssessmentAttemptsModule {}
