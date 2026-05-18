import { Module } from "@nestjs/common";
import { CdnService } from "./cdn.service";
import { AppConfigModule } from "../config";

@Module({
  imports: [AppConfigModule],
  providers: [CdnService],
  exports: [CdnService],
})
export class CdnModule {}
