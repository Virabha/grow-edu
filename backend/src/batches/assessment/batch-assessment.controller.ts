import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
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

  @BatchAccess("READ")
  @ApiOperation({ summary: "List quizzes in a batch" })
  @Get(":batchId/quizzes")
  listQuizzes(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.listQuizzes(batchId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Create a quiz (admin or batch teacher)" })
  @Post(":batchId/quizzes")
  createQuiz(
    @Param("batchId") batchId: string,
    @Body() dto: CreateBatchQuizDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.createQuiz(batchId, dto, user.userId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Get a quiz with its questions" })
  @Get(":batchId/quizzes/:quizId")
  getQuiz(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.getQuiz(batchId, quizId, user);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Update a quiz (admin or batch teacher)" })
  @Patch(":batchId/quizzes/:quizId")
  updateQuiz(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Body() dto: UpdateBatchQuizDto,
  ) {
    return this.assessment.updateQuiz(batchId, quizId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Delete a quiz (admin or batch teacher)" })
  @Delete(":batchId/quizzes/:quizId")
  deleteQuiz(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
  ) {
    return this.assessment.deleteQuiz(batchId, quizId);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Add a question to a quiz (admin or teacher)" })
  @Post(":batchId/quizzes/:quizId/questions")
  createQuestion(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Body() dto: CreateQuizQuestionDto,
  ) {
    return this.assessment.createQuestion(batchId, quizId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Update a quiz question (admin or teacher)" })
  @Patch(":batchId/quizzes/:quizId/questions/:questionId")
  updateQuestion(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("questionId") questionId: string,
    @Body() dto: UpdateQuizQuestionDto,
  ) {
    return this.assessment.updateQuestion(batchId, quizId, questionId, dto);
  }

  @BatchAccess("MANAGE")
  @ApiOperation({ summary: "Delete a quiz question (admin or teacher)" })
  @Delete(":batchId/quizzes/:quizId/questions/:questionId")
  deleteQuestion(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("questionId") questionId: string,
  ) {
    return this.assessment.deleteQuestion(batchId, quizId, questionId);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Start a quiz attempt (learner)" })
  @Post(":batchId/quizzes/:quizId/attempts")
  startAttempt(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.startAttempt(batchId, quizId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "List my attempts for a quiz" })
  @Get(":batchId/quizzes/:quizId/attempts")
  listMyAttempts(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.listMyAttempts(batchId, quizId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Quiz leaderboard" })
  @Get(":batchId/quizzes/:quizId/leaderboard")
  leaderboard(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.leaderboard(batchId, quizId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Get one attempt" })
  @Get(":batchId/quizzes/:quizId/attempts/:attemptId")
  getAttempt(
    @Param("batchId") batchId: string,
    @Param("quizId") quizId: string,
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.assessment.getAttempt(batchId, quizId, attemptId, user);
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Submit a quiz attempt (learner)" })
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
