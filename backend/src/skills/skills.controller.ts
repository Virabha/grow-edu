import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CreateSkillDto } from "./dto/create-skill.dto";
import { CreateSkillTagDto } from "./dto/create-skill-tag.dto";
import { UpdateSkillDto } from "./dto/update-skill.dto";
import { SkillsService } from "./skills.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("skills")
@Controller("skills")
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Roles("PLATFORM_ADMIN")
  @Post()
  create(@Body() dto: CreateSkillDto, @CurrentUser() actor: AuthedUser) {
    return this.skillsService.create(dto, actor.userId);
  }

  @Roles("PLATFORM_ADMIN")
  @Get()
  list() {
    return this.skillsService.list();
  }

  @Roles("PLATFORM_ADMIN")
  @Patch(":skillId")
  update(@Param("skillId") skillId: string, @Body() dto: UpdateSkillDto) {
    return this.skillsService.update(skillId, dto);
  }

  @Roles("PLATFORM_ADMIN")
  @Post(":skillId/tags")
  addTag(
    @Param("skillId") skillId: string,
    @Body() dto: CreateSkillTagDto,
  ) {
    return this.skillsService.addTag(skillId, dto);
  }

  @Roles("PLATFORM_ADMIN")
  @Delete(":skillId/tags/:tagId")
  removeTag(@Param("tagId") tagId: string) {
    return this.skillsService.removeTag(tagId);
  }

  @Roles("PLATFORM_ADMIN")
  @Get(":skillId/tags")
  listTags(@Param("skillId") skillId: string) {
    return this.skillsService.listTags(skillId);
  }

  @Authenticated()
  @Get("my-demonstrations")
  myDemonstrations(@CurrentUser() user: AuthedUser) {
    return this.skillsService.myDemonstrations(user.userId);
  }
}
