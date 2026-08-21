import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles, UserRole } from '../../auth/decorators/roles.decorator';
import { DailyPracticeQueryDto, DivergentQueryDto, RecordOutcomeDto } from './dto/practice.dto';
import { DailyPracticeService } from './daily-practice.service';
import { DifficultyCalibrationService } from './difficulty-calibration.service';
import { TopicPracticeService } from './topic-practice.service';

interface AuthedUser {
  userId: string;
}

@ApiTags('assessment')
@ApiBearerAuth()
@Authenticated()
@Controller('assessment/practice')
export class PracticeController {
  constructor(
    private readonly daily: DailyPracticeService,
    private readonly topic: TopicPracticeService,
  ) {}

  @ApiOperation({ summary: "Get or create today's personal daily practice set" })
  @Get('daily')
  daily_set(
    @Query() query: DailyPracticeQueryDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.daily.getOrCreate(user.userId, query.batchId);
  }

  @ApiOperation({ summary: 'Get the next adaptive question for a topic' })
  @Get('topic/:topicId/next')
  nextQuestion(
    @Param('topicId') topicId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.topic.nextQuestion(user.userId, topicId);
  }

  @ApiOperation({ summary: 'Record whether the student answered a served question correctly' })
  @Patch('served/:servedId')
  @HttpCode(200)
  recordOutcome(
    @Param('servedId') servedId: string,
    @Body() dto: RecordOutcomeDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.topic.recordOutcome(servedId, user.userId, dto.wasCorrect);
  }
}

@ApiTags('assessment')
@ApiBearerAuth()
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
@Controller('assessment/practice')
export class CalibrationController {
  constructor(private readonly calibration: DifficultyCalibrationService) {}

  @ApiOperation({ summary: 'List questions whose observed difficulty diverges from authored' })
  @Get('calibration/divergent')
  divergent(@Query() query: DivergentQueryDto) {
    return this.calibration.divergent(query.threshold);
  }

  @ApiOperation({ summary: 'Manually trigger difficulty recalibration (admin/instructor only)' })
  @Post('calibration/recalibrate')
  @HttpCode(200)
  recalibrate() {
    return this.calibration.recalibrate();
  }
}
