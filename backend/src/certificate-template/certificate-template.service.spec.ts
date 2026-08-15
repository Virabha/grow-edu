import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';

import { DATABASE_CONNECTION } from '../database/database.module';
import { CertificateTemplateService } from './certificate-template.service';
import { CertificateTemplateDto } from './dto/certificate-template.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY, UserRole } from '../auth/decorators/roles.decorator';

function makeDto(overrides: Partial<CertificateTemplateDto> = {}): CertificateTemplateDto {
  return {
    backgroundUrl: '',
    signatureUrl: '',
    signatoryName: 'Dr. Ananya Rao',
    signatoryTitle: 'Director of Studies',
    bodyText: 'This certifies that {{learner_name}} completed {{course_title}} on {{completion_date}}.',
    showQrCode: true,
    showCertificateId: true,
    accentColour: '#2563eb',
    ...overrides,
  };
}

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

describe('CertificateTemplateService › get — no row returns defaults', () => {
  let service: CertificateTemplateService;

  beforeEach(async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CertificateTemplateService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(CertificateTemplateService);
  });

  it('returns COLUMN_DEFAULTS when no row exists', async () => {
    const result = await service.get();
    expect(result).toEqual(COLUMN_DEFAULTS);
  });

  it('does not return null or undefined', async () => {
    const result = await service.get();
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
  });
});

describe('CertificateTemplateService › get — row exists', () => {
  let service: CertificateTemplateService;
  const storedRow: CertificateTemplateDto = {
    backgroundUrl: 'https://cdn.example.com/bg.png',
    signatureUrl: 'https://cdn.example.com/sig.png',
    signatoryName: 'Jane Doe',
    signatoryTitle: 'CEO',
    bodyText: 'This certifies {{learner_name}} completed {{course_title}}.',
    showQrCode: false,
    showCertificateId: true,
    accentColour: '#ef4444',
  };

  beforeEach(async () => {
    const dbMock = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([storedRow]),
          }),
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CertificateTemplateService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    service = moduleRef.get(CertificateTemplateService);
  });

  it('returns the stored row', async () => {
    const result = await service.get();
    expect(result).toEqual(storedRow);
  });
});

describe('CertificateTemplateService › upsert — idempotent', () => {
  const dto = makeDto();

  function buildDbMock(returnValue: CertificateTemplateDto) {
    return {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([returnValue]),
          }),
        }),
      }),
    };
  }

  it('returns the upserted row', async () => {
    const dbMock = buildDbMock(dto);
    const moduleRef = await Test.createTestingModule({
      providers: [
        CertificateTemplateService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    const result = await moduleRef.get(CertificateTemplateService).upsert(dto);
    expect(result).toEqual(dto);
  });

  it('uses a single insert statement with onConflictDoUpdate — no read-before-write', async () => {
    const dbMock = buildDbMock(dto);
    const moduleRef = await Test.createTestingModule({
      providers: [
        CertificateTemplateService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    await moduleRef.get(CertificateTemplateService).upsert(dto);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
  });

  it('calling twice returns the same result', async () => {
    const dbMock = buildDbMock(dto);
    const moduleRef = await Test.createTestingModule({
      providers: [
        CertificateTemplateService,
        { provide: DATABASE_CONNECTION, useValue: dbMock },
      ],
    }).compile();

    const svc = moduleRef.get(CertificateTemplateService);
    const r1 = await svc.upsert(dto);
    const r2 = await svc.upsert(dto);
    expect(r1).toEqual(r2);
  });
});

describe('RolesGuard › certificate-template route', () => {
  function makeGuard(requiredRole: UserRole) {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: unknown) => {
      if (key === ROLES_KEY) return [requiredRole];
      return undefined;
    });
    return new RolesGuard(reflector);
  }

  function makeCtx(userRole: UserRole): Parameters<RolesGuard['canActivate']>[0] {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: userRole } }) }),
    } as Parameters<RolesGuard['canActivate']>[0];
  }

  it('denies a LEARNER', () => {
    expect(makeGuard(UserRole.PLATFORM_ADMIN).canActivate(makeCtx(UserRole.LEARNER))).toBe(false);
  });

  it('allows a PLATFORM_ADMIN', () => {
    expect(makeGuard(UserRole.PLATFORM_ADMIN).canActivate(makeCtx(UserRole.PLATFORM_ADMIN))).toBe(true);
  });
});

describe('CertificateTemplateDto › accentColour', () => {
  it('rejects a bare colour name', async () => {
    const errors = await validate(plainToInstance(CertificateTemplateDto, makeDto({ accentColour: 'blue' })));
    expect(errors.filter((e) => e.property === 'accentColour').length).toBeGreaterThan(0);
  });

  it('rejects a hex without leading #', async () => {
    const errors = await validate(plainToInstance(CertificateTemplateDto, makeDto({ accentColour: '2563eb' })));
    expect(errors.filter((e) => e.property === 'accentColour').length).toBeGreaterThan(0);
  });

  it('accepts a 6-digit hex', async () => {
    const errors = await validate(plainToInstance(CertificateTemplateDto, makeDto({ accentColour: '#2563eb' })));
    expect(errors.filter((e) => e.property === 'accentColour')).toHaveLength(0);
  });

  it('accepts a 3-digit hex', async () => {
    const errors = await validate(plainToInstance(CertificateTemplateDto, makeDto({ accentColour: '#f0f' })));
    expect(errors.filter((e) => e.property === 'accentColour')).toHaveLength(0);
  });
});

describe('CertificateTemplateDto › URL fields', () => {
  it('accepts empty string for backgroundUrl', async () => {
    const errors = await validate(plainToInstance(CertificateTemplateDto, makeDto({ backgroundUrl: '' })));
    expect(errors.filter((e) => e.property === 'backgroundUrl')).toHaveLength(0);
  });

  it('accepts a valid https URL', async () => {
    const errors = await validate(
      plainToInstance(CertificateTemplateDto, makeDto({ backgroundUrl: 'https://cdn.example.com/bg.png' })),
    );
    expect(errors.filter((e) => e.property === 'backgroundUrl')).toHaveLength(0);
  });

  it('rejects a non-URL string', async () => {
    const errors = await validate(
      plainToInstance(CertificateTemplateDto, makeDto({ backgroundUrl: 'not a url' })),
    );
    expect(errors.filter((e) => e.property === 'backgroundUrl').length).toBeGreaterThan(0);
  });

  it('accepts empty string for signatureUrl', async () => {
    const errors = await validate(plainToInstance(CertificateTemplateDto, makeDto({ signatureUrl: '' })));
    expect(errors.filter((e) => e.property === 'signatureUrl')).toHaveLength(0);
  });
});
