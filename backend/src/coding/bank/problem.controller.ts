import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { isStaffRole } from "../../auth/staff";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import {
  CreateProblemDto,
  UpdateProblemDto,
  UpsertAssertionDto,
  UpsertEditorialDto,
  UpsertLanguageDto,
  UpsertTestCaseDto,
} from "./dto/problem.dto";
import { ProblemService } from "./problem.service";
import { ValidationService } from "./validation.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("coding")
@ApiBearerAuth()
@Controller("coding/problems")
export class ProblemController {
  constructor(
    private readonly problems: ProblemService,
    private readonly validation: ValidationService,
  ) {}

  @Authenticated()
  @ApiOperation({ summary: "List coding problems" })
  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.problems.list(isStaffRole(user.role));
  }

  @Authenticated()
  @ApiOperation({ summary: "The languages the platform supports" })
  @Get("languages")
  languages() {
    return this.problems.supportedLanguages();
  }

  @Authenticated()
  @ApiOperation({ summary: "Read a coding problem" })
  @Get(":problemId")
  read(@Param("problemId") problemId: string, @CurrentUser() user: AuthedUser) {
    return this.problems.read(problemId, isStaffRole(user.role));
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Author a coding problem" })
  @Post()
  create(
    @Body() dto: CreateProblemDto,
    @Body("statement") statement: unknown,
    @Body("constraints") constraints: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.problems.create(dto, user.userId, statement, constraints ?? []);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Update a coding problem" })
  @Put(":problemId")
  update(
    @Param("problemId") problemId: string,
    @Body() dto: UpdateProblemDto,
    @Body("statement") statement: unknown,
    @Body("constraints") constraints: unknown,
  ) {
    return this.problems.update(problemId, dto, statement, constraints);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Configure a problem for a language" })
  @Put(":problemId/languages")
  upsertLanguage(
    @Param("problemId") problemId: string,
    @Body() dto: UpsertLanguageDto,
  ) {
    return this.problems.upsertLanguage(problemId, dto);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Add or replace a test case" })
  @Put(":problemId/cases")
  upsertCase(
    @Param("problemId") problemId: string,
    @Body() dto: UpsertTestCaseDto,
  ) {
    return this.problems.upsertCase(problemId, dto);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Add or replace a front-end assertion" })
  @Put(":problemId/assertions")
  upsertAssertion(
    @Param("problemId") problemId: string,
    @Body() dto: UpsertAssertionDto,
  ) {
    return this.problems.upsertAssertion(problemId, dto);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Write the editorial" })
  @Put(":problemId/editorial")
  upsertEditorial(
    @Param("problemId") problemId: string,
    @Body() dto: UpsertEditorialDto,
    @Body("body") body: unknown,
  ) {
    return this.problems.upsertEditorial(problemId, dto, body);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Validate the reference solution against every case" })
  @Post(":problemId/validate")
  validate(
    @Param("problemId") problemId: string,
    @Query("language") language: string,
  ) {
    return this.validation.validate(problemId, language);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Publish a validated problem" })
  @Post(":problemId/publish")
  publish(@Param("problemId") problemId: string) {
    return this.problems.publish(problemId);
  }
}
