import { Module, Global } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { AppConfigService } from '../config';

// Use require for postgres to handle CommonJS/ESM compatibility
const postgres = require('postgres');

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

