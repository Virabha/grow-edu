import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import {
  AssessmentPapersController,
  AssessmentTestController,
} from "./assessment-test.controller";
import { AssessmentTestService } from "./assessment-test.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AssessmentTestController, AssessmentPapersController],
  providers: [AssessmentTestService],
  exports: [AssessmentTestService],
})
export class TestsModule {}
