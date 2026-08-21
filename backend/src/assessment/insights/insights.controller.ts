import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { CoverageService } from "./coverage.service";
import { FailedQuestionsQueryDto } from "./dto/insights.dto";
import { QuestionPerformanceService } from "./question-performance.service";

@ApiTags("assessment")
@ApiBearerAuth()
@Controller("assessment/insights")
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
export class InsightsController {
  constructor(
    private readonly coverage: CoverageService,
    private readonly performance: QuestionPerformanceService,
  ) {}

  @ApiOperation({ summary: "Tagging coverage across the question bank" })
  @Get("tagging-coverage")
  taggingCoverage() {
    return this.coverage.report();
  }

  @ApiOperation({ summary: "How students have performed on one question" })
  @Get("questions/:questionId/performance")
  questionPerformance(@Param("questionId") questionId: string) {
    return this.performance.forQuestion(questionId);
  }

  @ApiOperation({ summary: "Questions a whole cohort failed" })
  @Get("failed-questions")
  failedQuestions(@Query() query: FailedQuestionsQueryDto) {
    return this.performance.failedQuestions(query);
  }
}
