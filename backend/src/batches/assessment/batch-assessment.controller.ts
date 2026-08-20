import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { BatchManagerGuard } from "../access/batch-manager.guard";
import {
  CreateBatchQuizDto,
  CreateQuizQuestionDto,
  SubmitQuizAnswerDto,
  UpdateBatchQuizDto,
  UpdateQuizQuestionDto,
} from "../dto/batch-quiz.dto";
import { BatchAssessmentService } from "./batch-assessment.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@ApiBearerAuth()
@Controller("batches")
export class BatchAssessmentController {
  constructor(private readonly assessment: BatchAssessmentService) {}

  @ApiOperation({ summary: "List quizzes in a batch" })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes")
  listQuizzes(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.listQuizzes(batchId, user);
  }

  @ApiOperation({ summary: "Create a quiz (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/quizzes")
  createQuiz(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchQuizDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.createQuiz(batchId, dto, user.userId);
  }

  @ApiOperation({ summary: "Get a quiz with its questions" })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes/:quizId")
  getQuiz(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.getQuiz(batchId, quizId, user);
  }

  @ApiOperation({ summary: "Update a quiz (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/quizzes/:quizId")
  updateQuiz(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Body() dto: UpdateBatchQuizDto,
  ) {
    return this.assessment.updateQuiz(batchId, quizId, dto);
  }

  @ApiOperation({ summary: "Delete a quiz (admin or batch teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/quizzes/:quizId")
  deleteQuiz(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
  ) {
    return this.assessment.deleteQuiz(batchId, quizId);
  }

  @ApiOperation({ summary: "Add a question to a quiz (admin or teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Post(":batchId/quizzes/:quizId/questions")
  createQuestion(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Body() dto: CreateQuizQuestionDto,
  ) {
    return this.assessment.createQuestion(batchId, quizId, dto);
  }

  @ApiOperation({ summary: "Update a quiz question (admin or teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Patch(":batchId/quizzes/:quizId/questions/:questionId")
  updateQuestion(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("questionId") questionId: string,
    @Body() dto: UpdateQuizQuestionDto,
  ) {
    return this.assessment.updateQuestion(batchId, quizId, questionId, dto);
  }

  @ApiOperation({ summary: "Delete a quiz question (admin or teacher)" })
  @UseGuards(JwtAuthGuard, BatchManagerGuard)
  @Delete(":batchId/quizzes/:quizId/questions/:questionId")
  deleteQuestion(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("questionId") questionId: string,
  ) {
    return this.assessment.deleteQuestion(batchId, quizId, questionId);
  }

  @ApiOperation({ summary: "Start a quiz attempt (learner)" })
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/quizzes/:quizId/attempts")
  startAttempt(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.startAttempt(batchId, quizId, user);
  }

  @ApiOperation({ summary: "List my attempts for a quiz" })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes/:quizId/attempts")
  listMyAttempts(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.listMyAttempts(batchId, quizId, user);
  }

  @ApiOperation({ summary: "Quiz leaderboard" })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes/:quizId/leaderboard")
  leaderboard(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.leaderboard(batchId, quizId, user);
  }

  @ApiOperation({ summary: "Get one attempt" })
  @UseGuards(JwtAuthGuard)
  @Get(":batchId/quizzes/:quizId/attempts/:attemptId")
  getAttempt(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.getAttempt(batchId, quizId, attemptId, user);
  }

  @ApiOperation({ summary: "Submit a quiz attempt (learner)" })
  @UseGuards(JwtAuthGuard)
  @Post(":batchId/quizzes/:quizId/attempts/:attemptId/submit")
  submitAttempt(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("attemptId") attemptId: string,
    @Body() dto: SubmitQuizAnswerDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.submitAttempt(
      batchId,
      quizId,
      attemptId,
      dto,
      user,
    );
  }
}
