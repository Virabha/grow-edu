import { Global, Logger, Module } from "@nestjs/common";

import { AppConfigModule, AppConfigService } from "../config";
import { CLOCK, Clock } from "../common/clock";
import { BullJobQueue } from "./bull-job-queue";
import { InlineJobQueue } from "./inline-job-queue";
import { JOB_QUEUE, JobQueue } from "./job-queue";

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: JOB_QUEUE,
      inject: [AppConfigService, CLOCK],
      useFactory: (config: AppConfigService, clock: Clock): JobQueue => {
        const url = config.redisUrl;
        if (!url) {
          new Logger("JobsModule").warn(
            "REDIS_URL is not set — running jobs inline. Scheduled work will not fire on its own.",
          );
          return new InlineJobQueue(clock);
        }
        return new BullJobQueue(url);
      },
    },
  ],
  exports: [JOB_QUEUE],
})
export class JobsModule {}
