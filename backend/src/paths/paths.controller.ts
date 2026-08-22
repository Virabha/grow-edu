import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { AddPrerequisiteDto } from './dto/add-prerequisite.dto';
import { AddStageDto } from './dto/add-stage.dto';
import { CreatePathDto } from './dto/create-path.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { PathStagesService } from './path-stages.service';
import { PathsService } from './paths.service';

type JwtUser = { userId: string; role: string };

@Controller('paths')
export class PathsController {
  constructor(
    private readonly pathsService: PathsService,
    private readonly stagesService: PathStagesService,
  ) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @Post()
  create(@Body() dto: CreatePathDto, @CurrentUser() user: JwtUser) {
    return this.pathsService.create(dto, user.userId);
  }

  @Authenticated()
  @Get()
  list() {
    return this.pathsService.list();
  }

  @Authenticated()
  @Get(':pathId')
  findOne(@Param('pathId') pathId: string) {
    return this.pathsService.findOne(pathId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Patch(':pathId')
  update(@Param('pathId') pathId: string, @Body() dto: UpdatePathDto) {
    return this.pathsService.update(pathId, dto);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(':pathId/stages')
  addStage(@Param('pathId') pathId: string, @Body() dto: AddStageDto) {
    return this.stagesService.addStage(pathId, dto);
  }

  @Authenticated()
  @Get(':pathId/stages')
  listStages(@Param('pathId') pathId: string) {
    return this.stagesService.listStages(pathId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Put(':pathId/stages/reorder')
  reorderStages(@Param('pathId') pathId: string, @Body() dto: ReorderStagesDto) {
    return this.stagesService.reorderStages(pathId, dto);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Patch(':pathId/stages/:stageId')
  updateStage(
    @Param('pathId') pathId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.stagesService.updateStage(pathId, stageId, dto);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(':pathId/stages/:stageId')
  deleteStage(@Param('pathId') pathId: string, @Param('stageId') stageId: string) {
    return this.stagesService.deleteStage(pathId, stageId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(':pathId/stages/:stageId/prerequisites')
  addPrerequisite(
    @Param('pathId') pathId: string,
    @Param('stageId') stageId: string,
    @Body() dto: AddPrerequisiteDto,
  ) {
    return this.stagesService.addPrerequisite(pathId, stageId, dto);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(':pathId/stages/:stageId/prerequisites/:requiredStageId')
  removePrerequisite(
    @Param('pathId') pathId: string,
    @Param('stageId') stageId: string,
    @Param('requiredStageId') requiredStageId: string,
  ) {
    return this.stagesService.removePrerequisite(pathId, stageId, requiredStageId);
  }
}
