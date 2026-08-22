import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { isStaffRole } from "../../auth/staff";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import {
  RecordFrontendResultDto,
  RunCodeDto,
  SaveDraftDto,
} from "../bank/dto/problem.dto";
import { FrontendService } from "./frontend.service";
import { RunService } from "./run.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("coding")
@ApiBearerAuth()
@Controller("coding")
export class RunController {
  constructor(
    private readonly runs: RunService,
    private readonly frontend: FrontendService,
  ) {}

  @Authenticated()
  @ApiOperation({ summary: "Run against the visible cases" })
  @Post("problems/:problemId/run")
  run(
    @Param("problemId") problemId: string,
    @Body() dto: RunCodeDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.runs.queue(
      problemId,
      user.userId,
      "SAMPLE_RUN",
      dto.language,
      dto.sourceCode,
    );
  }

  @Authenticated()
  @ApiOperation({ summary: "Submit for judgement against the hidden cases" })
  @Post("problems/:problemId/submit")
  submit(
    @Param("problemId") problemId: string,
    @Body() dto: RunCodeDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.runs.queue(
      problemId,
      user.userId,
      "JUDGE_SUBMISSION",
      dto.language,
      dto.sourceCode,
    );
  }

  @Authenticated()
  @ApiOperation({ summary: "Read a run and its result" })
  @Get("runs/:runId")
  readRun(@Param("runId") runId: string, @CurrentUser() user: AuthedUser) {
    return this.runs.readRun(runId, user.userId, isStaffRole(user.role));
  }

  @Authenticated()
  @ApiOperation({ summary: "My submission history for a problem" })
  @Get("problems/:problemId/submissions")
  history(
    @Param("problemId") problemId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.runs.history(problemId, user.userId);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "A student's path to a solution" })
  @Get("problems/:problemId/submissions/of/:studentId")
  historyOf(
    @Param("problemId") problemId: string,
    @Param("studentId") studentId: string,
  ) {
    return this.runs.historyFor(problemId, studentId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Save editor state for a problem" })
  @Put("problems/:problemId/draft")
  saveDraft(
    @Param("problemId") problemId: string,
    @Body() dto: SaveDraftDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.runs.saveDraft(
      problemId,
      user.userId,
      dto.language,
      dto.sourceCode,
    );
  }

  @Authenticated()
  @ApiOperation({ summary: "Restore editor state, or the starter code" })
  @Get("problems/:problemId/draft")
  readDraft(
    @Param("problemId") problemId: string,
    @Query("language") language: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.runs.readDraft(problemId, user.userId, language);
  }

  @Authenticated()
  @ApiOperation({ summary: "Give up on a problem to unlock its editorial" })
  @Post("problems/:problemId/give-up")
  giveUp(
    @Param("problemId") problemId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.runs.giveUp(problemId, user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Read the editorial once solved or given up" })
  @Get("problems/:problemId/editorial")
  editorial(
    @Param("problemId") problemId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.runs.editorial(problemId, user.userId, isStaffRole(user.role));
  }

  @Authenticated()
  @ApiOperation({ summary: "Visible assertions and their scripts for practice" })
  @Get("problems/:problemId/assertions")
  sampleAssertions(@Param("problemId") problemId: string) {
    return this.frontend.sampleBundle(problemId);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Every assertion, including hidden ones (staff only)" })
  @Get("problems/:problemId/assertions/judge")
  judgeAssertions(@Param("problemId") problemId: string) {
    return this.frontend.judgeBundle(problemId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Record the result of a browser-run front-end problem" })
  @Post("problems/:problemId/frontend-result")
  recordFrontend(
    @Param("problemId") problemId: string,
    @Body() dto: RecordFrontendResultDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.frontend.record(problemId, user.userId, dto.passedOrdinals);
  }

  @Authenticated()
  @ApiOperation({ summary: "My front-end results for a problem" })
  @Get("problems/:problemId/frontend-results")
  myFrontendResults(
    @Param("problemId") problemId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.frontend.myResults(problemId, user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "My execution consumption" })
  @Get("usage/me")
  usage(@CurrentUser() user: AuthedUser) {
    return this.runs.usageFor(user.userId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "A student's execution consumption" })
  @Get("usage/of/:studentId")
  usageOf(@Param("studentId") studentId: string) {
    return this.runs.usageFor(studentId);
  }
}
