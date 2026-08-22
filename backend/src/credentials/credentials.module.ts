import { Module } from "@nestjs/common";
import { PathCertificateIssuanceService } from "./path-certificate-issuance.service";
import { PathCertificateVerificationController } from "./path-certificate-verification.controller";
import { PathCompletionCriteriaController } from "./path-completion-criteria.controller";
import { PathCompletionCriteriaService } from "./path-completion-criteria.service";

@Module({
  controllers: [
    PathCompletionCriteriaController,
    PathCertificateVerificationController,
  ],
  providers: [
    PathCompletionCriteriaService,
    PathCertificateIssuanceService,
  ],
  exports: [PathCertificateIssuanceService],
})
export class CredentialsModule {}
