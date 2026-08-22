import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { ErrorNotebookController } from "./error-notebook.controller";
import { ErrorNotebookService } from "./error-notebook.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ErrorNotebookController],
  providers: [ErrorNotebookService],
  exports: [ErrorNotebookService],
})
export class AssessmentNotebookModule {}
