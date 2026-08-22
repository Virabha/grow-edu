import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { BulkGenerationService } from "./bulk-generation.service";
import { QuestionGenerationService } from "./question-generation.service";
import {
  BulkGenerateQuestionsDto,
  GenerateQuestionsDto,
} from "./dto/question-generation.dto";
import {
  CreateQuestionDto,
  SearchQuestionsDto,
  UpdateQuestionDto,
  UpdateQuestionTagsDto,
} from "./dto/question.dto";
import { QuestionBankService } from "./question-bank.service";

interface AuthedUser {
  userId: string;
  organizationId?: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Controller("assessment/questions")
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
export class QuestionBankController {
  constructor(
    private readonly bank: QuestionBankService,
    private readonly generation: QuestionGenerationService,
    private readonly bulkGeneration: BulkGenerationService,
  ) {}

  @ApiOperation({ summary: "Author a question independently of any test" })
  @Post()
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthedUser) {
    return this.bank.create(dto, user.userId);
  }

  @ApiOperation({ summary: "Generate draft questions from a lesson using AI" })
  @Post("generate")
  generate(@Body() dto: GenerateQuestionsDto, @CurrentUser() user: AuthedUser) {
    return this.generation.generateFromLesson(
      dto.lessonId ?? "",
      dto.subjectId,
      dto.topicId,
      dto.difficulty,
      dto.count,
      user.userId,
      user.organizationId ?? null,
    );
  }

  @ApiOperation({ summary: "Submit a bulk batch generation of practice questions" })
  @Post("bulk-generate")
  bulkGenerate(
    @Body() dto: BulkGenerateQuestionsDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.bulkGeneration.submitBulkGeneration(
      dto.subjectId,
      dto.topicId,
      dto.difficulty,
      dto.count,
      user.userId,
      user.organizationId ?? null,
    );
  }

  @ApiOperation({ summary: "Search and filter the bank" })
  @Get()
  search(@Query() query: SearchQuestionsDto) {
    return this.bank.search(query);
  }

  @ApiOperation({ summary: "Read a question at its current version" })
  @Get(":questionId")
  get(@Param("questionId") questionId: string) {
    return this.bank.get(questionId);
  }

  @ApiOperation({ summary: "Read one version of a question" })
  @Get(":questionId/versions/:version")
  getVersion(
    @Param("questionId") questionId: string,
    @Param("version", ParseIntPipe) version: number,
  ) {
    return this.bank.getVersion(questionId, version);
  }

  @ApiOperation({ summary: "Edit a question, producing a new version" })
  @Patch(":questionId")
  edit(
    @Param("questionId") questionId: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.bank.edit(questionId, dto, user.userId);
  }

  @ApiOperation({ summary: "Retag a question without producing a new version" })
  @Patch(":questionId/tags")
  retag(
    @Param("questionId") questionId: string,
    @Body() dto: UpdateQuestionTagsDto,
  ) {
    return this.bank.retag(questionId, dto);
  }

  @ApiOperation({ summary: "Retire a question; it is never hard-deleted" })
  @Post(":questionId/retire")
  retire(@Param("questionId") questionId: string) {
    return this.bank.retire(questionId);
  }

  @ApiOperation({ summary: "Approve a generated question for student use" })
  @Post(":questionId/approve")
  approve(@Param("questionId") questionId: string, @CurrentUser() user: AuthedUser) {
    return this.bank.approve(questionId, user.userId);
  }

  @ApiOperation({ summary: "Reject a generated question so it never reaches students" })
  @Post(":questionId/reject")
  reject(@Param("questionId") questionId: string, @CurrentUser() user: AuthedUser) {
    return this.bank.reject(questionId, user.userId);
  }
}
