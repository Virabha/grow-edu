import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../../src/app.module';
import { DATABASE_CONNECTION } from '../../src/database/database.module';
import { CLOCK } from '../../src/common/clock';
import { JOB_QUEUE } from '../../src/jobs/job-queue';
import { InlineJobQueue } from '../../src/jobs/inline-job-queue';
import { TestClock } from './test-clock';
import { TestDatabase } from './test-database';

export type TestActor = {
  userId: string;
  email: string;
  role: string;
};

export type ProviderOverride = { token: unknown; value: unknown };

export async function createTestApp(
  database: TestDatabase,
  clock: TestClock = new TestClock(),
  overrides: ProviderOverride[] = [],
): Promise<INestApplication> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(DATABASE_CONNECTION)
    .useValue(database.db)
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(JOB_QUEUE)
    .useValue(new InlineJobQueue(clock));

  for (const override of overrides) {
    builder.overrideProvider(override.token).useValue(override.value);
  }

  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.set('trust proxy', 1);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

export function tokenFor(
  app: INestApplication,
  actor: TestActor,
  extra: Record<string, string> = {},
): string {
  const jwtService = app.get(JwtService, { strict: false });
  return jwtService.sign({
    sub: actor.userId,
    email: actor.email,
    role: actor.role,
    ...extra,
  });
}

export function authHeader(
  app: INestApplication,
  actor: TestActor,
  extra: Record<string, string> = {},
): [string, string] {
  return ['Authorization', `Bearer ${tokenFor(app, actor, extra)}`];
}
