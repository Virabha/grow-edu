import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [DatabaseModule, EmailModule, FilesModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}

