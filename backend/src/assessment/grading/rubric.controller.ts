import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import {
  AddCriterionDto,
  AttachRubricDto,
  CreateRubricDto,
  UpdateCriterionDto,
  UpdateRubricDto,
} from "./dto/rubric.dto";
import { RubricService } from "./rubric.service";

interface AuthedUser {
  userId: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
@Controller("assessment/rubrics")
export class RubricController {
  constructor(private readonly rubrics: RubricService) {}

  @ApiOperation({ summary: "Create a rubric" })
  @Post()
  create(@Body() dto: CreateRubricDto, @CurrentUser() user: AuthedUser) {
    return this.rubrics.createRubric(dto, user.userId);
  }

  @ApiOperation({ summary: "Get a rubric with its criteria" })
  @Get(":rubricId")
  get(@Param("rubricId") rubricId: string) {
    return this.rubrics.getRubric(rubricId);
  }

  @ApiOperation({ summary: "Update rubric metadata" })
  @Patch(":rubricId")
  update(@Param("rubricId") rubricId: string, @Body() dto: UpdateRubricDto) {
    return this.rubrics.updateRubric(rubricId, dto);
  }

  @ApiOperation({ summary: "Add a criterion to a rubric" })
  @Post(":rubricId/criteria")
  addCriterion(
    @Param("rubricId") rubricId: string,
    @Body() dto: AddCriterionDto,
  ) {
    return this.rubrics.addCriterion(rubricId, dto);
  }

  @ApiOperation({ summary: "Update a criterion" })
  @Patch(":rubricId/criteria/:criterionId")
  updateCriterion(
    @Param("rubricId") rubricId: string,
    @Param("criterionId") criterionId: string,
    @Body() dto: UpdateCriterionDto,
  ) {
    return this.rubrics.updateCriterion(rubricId, criterionId, dto);
  }

  @ApiOperation({ summary: "Remove a criterion" })
  @Delete(":rubricId/criteria/:criterionId")
  @HttpCode(200)
  removeCriterion(
    @Param("rubricId") rubricId: string,
    @Param("criterionId") criterionId: string,
  ) {
    return this.rubrics.removeCriterion(rubricId, criterionId);
  }
}

@ApiTags("assessment")
@ApiBearerAuth()
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
@Controller("assessment/test-questions")
export class PlacementRubricController {
  constructor(private readonly rubrics: RubricService) {}

  @ApiOperation({ summary: "Attach a rubric to a test placement" })
  @Put(":placementId/rubric")
  attach(
    @Param("placementId") placementId: string,
    @Body() dto: AttachRubricDto,
  ) {
    return this.rubrics.attachRubricToPlacement(placementId, dto);
  }
}
