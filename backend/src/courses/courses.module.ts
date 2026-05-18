import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [DatabaseModule, FilesModule, EmailModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}

