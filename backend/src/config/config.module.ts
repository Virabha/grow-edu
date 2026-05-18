import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configSchema } from './config.schema';
import { AppConfigService } from './config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const result = configSchema.safeParse(config);
        if (!result.success) {
          const errors = result.error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          }));
          throw new Error(
            `Configuration validation failed:\n${errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n')}`,
          );
        }
        return result.data;
      },
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService, NestConfigModule],
})
export class AppConfigModule {}

