import { Module } from "@nestjs/common";
import { BatchesController } from "./batches.controller";
import { BatchesService } from "./batches.service";
import { CertificateService } from "./certificate.service";
import { BatchManagerGuard } from "./guards/batch-manager.guard";
import { DatabaseModule } from "../database/database.module";
import { FilesModule } from "../files/files.module";
import { CdnModule } from "../cdn/cdn.module";
import { AppCacheModule } from "../cache/cache.module";
import { EmailModule } from "../email/email.module";
import { PaymentModule } from "../payment/payment.module";
import { CouponsModule } from "../coupons/coupons.module";
import { CertificateTemplateModule } from "../certificate-template/certificate-template.module";

@Module({
  imports: [
    DatabaseModule,
    FilesModule,
    CdnModule,
    AppCacheModule,
    EmailModule,
    PaymentModule,
    CouponsModule,
    CertificateTemplateModule,
  ],
  controllers: [BatchesController],
  providers: [BatchesService, CertificateService, BatchManagerGuard],
  exports: [BatchesService, CertificateService],
})
export class BatchesModule {}
