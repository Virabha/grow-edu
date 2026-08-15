import { Module } from '@nestjs/common';
import { CertificateTemplateController } from './certificate-template.controller';
import { CertificateTemplateService } from './certificate-template.service';

@Module({
  controllers: [CertificateTemplateController],
  providers: [CertificateTemplateService],
  exports: [CertificateTemplateService],
})
export class CertificateTemplateModule {}
