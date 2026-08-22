import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';
import {
  ENVIRONMENT_PROVIDER,
  HttpEnvironmentProvider,
} from './environment-provider';

@Module({
  imports: [DatabaseModule],
  controllers: [EnvironmentsController],
  providers: [
    EnvironmentsService,
    { provide: ENVIRONMENT_PROVIDER, useClass: HttpEnvironmentProvider },
  ],
})
export class EnvironmentsModule {}
