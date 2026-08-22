import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { DiagnosticController } from "./diagnostic.controller";
import { DiagnosticService } from "./diagnostic.service";

@Module({
  imports: [DatabaseModule],
  controllers: [DiagnosticController],
  providers: [DiagnosticService],
  exports: [DiagnosticService],
})
export class DiagnosticModule {}
