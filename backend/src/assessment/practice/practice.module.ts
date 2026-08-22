import { Module } from '@nestjs/common';

import { DifficultyCalibrationService } from './difficulty-calibration.service';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { DailyPracticeService } from './daily-practice.service';
import { TopicPracticeService } from './topic-practice.service';
import { CalibrationController, PracticeController } from './practice.controller';

@Module({
  controllers: [GenerationController, PracticeController, CalibrationController],
  providers: [
    GenerationService,
    DailyPracticeService,
    TopicPracticeService,
    DifficultyCalibrationService,
  ],
  exports: [GenerationService, DailyPracticeService],
})
export class PracticeModule {}
