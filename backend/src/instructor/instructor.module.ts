import { Module } from '@nestjs/common';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';
import { MeetingCredentialsController } from './meeting-credentials.controller';
import { MeetingCredentialsService } from './meeting-credentials.service';
import { DatabaseModule } from '../database/database.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [DatabaseModule, FilesModule],
  controllers: [InstructorController, MeetingCredentialsController],
  providers: [InstructorService, MeetingCredentialsService],
  exports: [InstructorService, MeetingCredentialsService],
})
export class InstructorModule {}
