import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { GradingModule } from "../assessment/grading/grading.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [DatabaseModule, GradingModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
