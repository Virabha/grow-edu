import { Module } from "@nestjs/common";
import { BatchesController } from "./batches.controller";
import { BatchesService } from "./batches.service";
import { DatabaseModule } from "../database/database.module";
import { FilesModule } from "../files/files.module";
import { CdnModule } from "../cdn/cdn.module";
import { AppCacheModule } from "../cache/cache.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [DatabaseModule, FilesModule, CdnModule, AppCacheModule, EmailModule],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
