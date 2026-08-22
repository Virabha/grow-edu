import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { JobBoardController } from "./job-board.controller";
import { JobBoardService } from "./job-board.service";
import { MentorshipController } from "./mentorship.controller";
import { MentorshipService } from "./mentorship.service";
import { MockInterviewsController } from "./mock-interviews.controller";
import { MockInterviewsService } from "./mock-interviews.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    MentorshipController,
    MockInterviewsController,
    JobBoardController,
  ],
  providers: [MentorshipService, MockInterviewsService, JobBoardService],
})
export class CareersModule {}
