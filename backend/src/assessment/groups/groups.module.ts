import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { QuestionGroupController } from "./question-group.controller";
import { QuestionGroupService } from "./question-group.service";

@Module({
  imports: [DatabaseModule],
  controllers: [QuestionGroupController],
  providers: [QuestionGroupService],
  exports: [QuestionGroupService],
})
export class GroupsModule {}
