import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import {
  CreateTaxonomyNodeDto,
  ListTaxonomyNodesDto,
  ReplaceDifficultyScaleDto,
  UpdateTaxonomyNodeDto,
} from "./dto/taxonomy.dto";
import { TaxonomyService } from "./taxonomy.service";

interface AuthedUser {
  userId: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Controller("assessment")
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Create a subject, topic or sub-topic" })
  @Post("taxonomy/nodes")
  create(
    @Body() dto: CreateTaxonomyNodeDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.taxonomy.create(dto, user.userId);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "List taxonomy nodes" })
  @Get("taxonomy/nodes")
  list(@Query() query: ListTaxonomyNodesDto) {
    return this.taxonomy.list(query);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "The taxonomy as a tree" })
  @Get("taxonomy/tree")
  tree(@Query() query: ListTaxonomyNodesDto) {
    return this.taxonomy.tree(query.includeRetired === true);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Rename a taxonomy node" })
  @Patch("taxonomy/nodes/:nodeId")
  rename(
    @Param("nodeId") nodeId: string,
    @Body() dto: UpdateTaxonomyNodeDto,
  ) {
    return this.taxonomy.rename(nodeId, dto);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Retire a node and everything under it" })
  @Post("taxonomy/nodes/:nodeId/retire")
  retire(@Param("nodeId") nodeId: string) {
    return this.taxonomy.retire(nodeId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Delete a node that has no questions tagged to it" })
  @Delete("taxonomy/nodes/:nodeId")
  remove(@Param("nodeId") nodeId: string) {
    return this.taxonomy.remove(nodeId);
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "The configured difficulty scale" })
  @Get("difficulty-levels")
  difficultyScale() {
    return this.taxonomy.difficultyScale();
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Replace the difficulty scale" })
  @Put("difficulty-levels")
  replaceDifficultyScale(@Body() dto: ReplaceDifficultyScaleDto) {
    return this.taxonomy.replaceDifficultyScale(dto.levels);
  }
}
