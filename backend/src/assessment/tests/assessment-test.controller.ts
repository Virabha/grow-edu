import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import {
  AddQuestionToTestDto,
  CreateAssessmentTestDto,
  ListPapersDto,
  ListTestsDto,
  UpdateAssessmentTestDto,
  UpdateTestPlacementDto,
} from "./dto/assessment-test.dto";
import { AssessmentTestService } from "./assessment-test.service";

interface AuthedUser {
  userId: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
@Controller("assessment/tests")
export class AssessmentTestController {
  constructor(private readonly service: AssessmentTestService) {}

  @ApiOperation({ summary: "Create a new test" })
  @Post()
  create(@Body() dto: CreateAssessmentTestDto, @CurrentUser() user: AuthedUser) {
    return this.service.createTest(dto, user.userId);
  }

  @ApiOperation({ summary: "List tests" })
  @Get()
  list(@Query() query: ListTestsDto) {
    return this.service.listTests(query);
  }

  @ApiOperation({ summary: "Get a test with its computed max score" })
  @Get(":testId")
  get(@Param("testId") testId: string) {
    return this.service.getTest(testId);
  }

  @ApiOperation({ summary: "Update test settings" })
  @Patch(":testId")
  update(@Param("testId") testId: string, @Body() dto: UpdateAssessmentTestDto) {
    return this.service.updateTest(testId, dto);
  }

  @ApiOperation({ summary: "Soft-delete a test; leaves bank questions untouched" })
  @Delete(":testId")
  @HttpCode(200)
  remove(@Param("testId") testId: string) {
    return this.service.deleteTest(testId);
  }

  @ApiOperation({ summary: "Add a bank question (or its whole group) to a test" })
  @Post(":testId/questions")
  addQuestion(
    @Param("testId") testId: string,
    @Body() dto: AddQuestionToTestDto,
  ) {
    return this.service.addQuestion(testId, dto);
  }

  @ApiOperation({ summary: "List placements in order" })
  @Get(":testId/questions")
  listPlacements(@Param("testId") testId: string) {
    return this.service.listPlacements(testId);
  }

  @ApiOperation({ summary: "Update marks or negative rule for a placement" })
  @Patch(":testId/questions/:placementId")
  updatePlacement(
    @Param("testId") testId: string,
    @Param("placementId") placementId: string,
    @Body() dto: UpdateTestPlacementDto,
  ) {
    return this.service.updatePlacement(testId, placementId, dto);
  }

  @ApiOperation({ summary: "Remove a placement (removes whole group if grouped)" })
  @Delete(":testId/questions/:placementId")
  @HttpCode(200)
  removePlacement(
    @Param("testId") testId: string,
    @Param("placementId") placementId: string,
  ) {
    return this.service.removePlacement(testId, placementId);
  }
}

@ApiTags("assessment")
@ApiBearerAuth()
@Authenticated()
@Controller("assessment/papers")
export class AssessmentPapersController {
  constructor(private readonly service: AssessmentTestService) {}

  @ApiOperation({ summary: "List previous-year papers; filterable by exam and year" })
  @Get()
  list(@Query() query: ListPapersDto) {
    return this.service.listPapers(query);
  }
}
