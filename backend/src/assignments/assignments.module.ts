import { Module } from "@nestjs/common";
import { AssignmentsController, AssignmentSubmissionsController } from "./assignments.controller";
import { AssignmentsService } from "./assignments.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AssignmentsController, AssignmentSubmissionsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
