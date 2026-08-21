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
import {
  CreateQuestionDto,
  SearchQuestionsDto,
  UpdateQuestionDto,
  UpdateQuestionTagsDto,
} from "./dto/question.dto";
import { QuestionBankService } from "./question-bank.service";

interface AuthedUser {
  userId: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Controller("assessment/questions")
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
export class QuestionBankController {
  constructor(private readonly bank: QuestionBankService) {}

  @ApiOperation({ summary: "Author a question independently of any test" })
  @Post()
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthedUser) {
    return this.bank.create(dto, user.userId);
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
}
