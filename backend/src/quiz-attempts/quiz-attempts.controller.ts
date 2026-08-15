import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QuizAttemptsService } from './quiz-attempts.service';
import { FilterQuizAttemptsDto } from './dto/filter-quiz-attempts.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('quiz-attempts')
@Controller('quiz-attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.CORPORATE_ADMIN, UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class QuizAttemptsController {
  constructor(private readonly quizAttemptsService: QuizAttemptsService) {}

  @ApiOperation({ summary: 'Submit a lesson quiz and record the attempt' })
  @ApiResponse({ status: 201, description: 'Attempt created and graded' })
  @Post()
  submit(
    @Body() dto: SubmitQuizAttemptDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.quizAttemptsService.submit(user.userId, dto);
  }

  @ApiOperation({ summary: "List the caller's submitted quiz attempts, newest first" })
  @ApiResponse({ status: 200, description: 'Paginated list of attempts' })
  @Get()
  list(
    @Query() dto: FilterQuizAttemptsDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.quizAttemptsService.list(user.userId, dto);
  }

  @ApiOperation({ summary: 'Aggregate stats for the dashboard widget' })
  @ApiResponse({ status: 200, description: 'Total attempted, passed, average score' })
  @Get('summary')
  getSummary(@CurrentUser() user: { userId: string }) {
    return this.quizAttemptsService.getSummary(user.userId);
  }

  @ApiOperation({ summary: "Get one attempt in full (caller's own only)" })
  @ApiResponse({ status: 200, description: 'Attempt with per-question answer breakdown' })
  @ApiResponse({ status: 404, description: 'Not found or belongs to another user' })
  @Get(':attemptId')
  findOne(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.quizAttemptsService.findOne(user.userId, attemptId);
  }
}
