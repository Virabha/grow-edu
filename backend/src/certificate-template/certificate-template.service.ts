import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { certificateTemplates } from '../database/schema';
import { CertificateTemplateDto } from './dto/certificate-template.dto';

const DEFAULT_SCOPE = 'default';

const COLUMN_DEFAULTS: CertificateTemplateDto = {
  backgroundUrl: '',
  signatureUrl: '',
  signatoryName: '',
  signatoryTitle: '',
  bodyText: '',
  showQrCode: true,
  showCertificateId: true,
  accentColour: '#2563eb',
};

type DbType = PostgresJsDatabase<typeof schema>;

const TEMPLATE_COLUMNS = {
  backgroundUrl: certificateTemplates.backgroundUrl,
  signatureUrl: certificateTemplates.signatureUrl,
  signatoryName: certificateTemplates.signatoryName,
  signatoryTitle: certificateTemplates.signatoryTitle,
  bodyText: certificateTemplates.bodyText,
  showQrCode: certificateTemplates.showQrCode,
  showCertificateId: certificateTemplates.showCertificateId,
  accentColour: certificateTemplates.accentColour,
};

@Injectable()
export class CertificateTemplateService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
  ) {}

  async get(): Promise<CertificateTemplateDto> {
    const [row] = await this.db
      .select(TEMPLATE_COLUMNS)
      .from(certificateTemplates)
      .where(eq(certificateTemplates.scope, DEFAULT_SCOPE))
      .limit(1);

    return row ?? COLUMN_DEFAULTS;
  }

  async upsert(dto: CertificateTemplateDto): Promise<CertificateTemplateDto> {
    const [row] = await this.db
      .insert(certificateTemplates)
      .values({
        scope: DEFAULT_SCOPE,
        backgroundUrl: dto.backgroundUrl,
        signatureUrl: dto.signatureUrl,
        signatoryName: dto.signatoryName,
        signatoryTitle: dto.signatoryTitle,
        bodyText: dto.bodyText,
        showQrCode: dto.showQrCode,
        showCertificateId: dto.showCertificateId,
        accentColour: dto.accentColour,
      })
      .onConflictDoUpdate({
        target: [certificateTemplates.organizationId, certificateTemplates.scope],
        set: {
          backgroundUrl: dto.backgroundUrl,
          signatureUrl: dto.signatureUrl,
          signatoryName: dto.signatoryName,
          signatoryTitle: dto.signatoryTitle,
          bodyText: dto.bodyText,
          showQrCode: dto.showQrCode,
          showCertificateId: dto.showCertificateId,
          accentColour: dto.accentColour,
          updatedAt: new Date(),
        },
      })
      .returning(TEMPLATE_COLUMNS);

    if (!row) {
      return dto;
    }
    return row;
  }
}
