import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { InstructorModule } from '../instructor/instructor.module';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveSessionsService } from './live-sessions.service';

@Module({
  imports: [DatabaseModule, InstructorModule],
  controllers: [LiveSessionsController],
  providers: [LiveSessionsService],
})
export class LiveSessionsModule {}
