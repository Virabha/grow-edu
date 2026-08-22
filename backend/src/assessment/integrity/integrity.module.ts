import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AnomalyDetectionService } from "./anomaly-detection.service";
import { IntegrityController } from "./integrity.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [IntegrityController],
  providers: [AnomalyDetectionService],
})
export class IntegrityModule {}
