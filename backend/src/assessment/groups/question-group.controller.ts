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
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import {
  AddMemberDto,
  CreateQuestionGroupDto,
  UpdateQuestionGroupDto,
} from "./dto/question-group.dto";
import { QuestionGroupService } from "./question-group.service";

interface AuthedUser {
  userId: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Controller("assessment/question-groups")
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
export class QuestionGroupController {
  constructor(private readonly groups: QuestionGroupService) {}

  @ApiOperation({ summary: "Create a question group with shared stimulus" })
  @Post()
  create(
    @Body() dto: CreateQuestionGroupDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.groups.create(dto, user.userId);
  }

  @ApiOperation({
    summary: "Read a group's stimulus and its ordered members",
  })
  @Get(":groupId")
  get(@Param("groupId") groupId: string) {
    return this.groups.get(groupId);
  }

  @ApiOperation({ summary: "Update a group's title or stimulus" })
  @Patch(":groupId")
  update(
    @Param("groupId") groupId: string,
    @Body() dto: UpdateQuestionGroupDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.groups.update(groupId, dto, user.userId);
  }

  @ApiOperation({ summary: "Add a question as a member of this group" })
  @Post(":groupId/members")
  addMember(
    @Param("groupId") groupId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.groups.addMember(groupId, dto);
  }

  @ApiOperation({ summary: "Remove a question from this group" })
  @Delete(":groupId/members/:questionId")
  removeMember(
    @Param("groupId") groupId: string,
    @Param("questionId") questionId: string,
  ) {
    return this.groups.removeMember(groupId, questionId);
  }

  @ApiOperation({
    summary: "Retire a group; members remain independently usable",
  })
  @Post(":groupId/retire")
  retire(@Param("groupId") groupId: string) {
    return this.groups.retire(groupId);
  }
}
