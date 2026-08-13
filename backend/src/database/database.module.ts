import { Module, Global } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { AppConfigService } from '../config';
// TypeScript's CommonJS import form, which emits a real `require`.
//
// A plain `import postgres from 'postgres'` compiles to `postgres_1.default`,
// and postgres.js sets `module.exports = Postgres` with no `.default`. This
// tsconfig has `allowSyntheticDefaultImports` (type-checking only) but NOT
// `esModuleInterop` (which changes emit), so the default import type-checks and
// then crashes at boot with "postgres_1.default is not a function".
//
// esModuleInterop cannot simply be switched on: `import * as PDFDocument from
// "pdfkit"` in batches/certificate.service.ts is used with `new PDFDocument()`,
// which the flag would break.
import postgres = require('postgres');

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => {
        const connectionString = configService.databaseUrl;
        if (!connectionString) {
          throw new Error('DATABASE_URL is not defined');
        }
        const isProduction = configService.isProduction();
        const client = postgres(connectionString, {
          max: 5,
          idle_timeout: 30,
          connect_timeout: 15,
          ...(isProduction && {
            ssl: { rejectUnauthorized: false },
          }),
        });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}

