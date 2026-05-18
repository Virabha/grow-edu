import { Module } from "@nestjs/common";
import { LessonsController } from "./lessons.controller";
import { LessonsService } from "./lessons.service";
import { DatabaseModule } from "../database/database.module";
import { CdnModule } from "../cdn/cdn.module";
import { EnrollmentsModule } from "../enrollments/enrollments.module";

@Module({
  imports: [DatabaseModule, CdnModule, EnrollmentsModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
