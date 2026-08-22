import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchAccess } from '../batches/access/batch-access.decorator';
import { CreateStudyGroupDto } from './dto/create-study-group.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';
import { RemoveGroupMessageDto } from './dto/remove-group-message.dto';
import { StudyGroupService } from './study-group.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('community')
@ApiBearerAuth()
@Controller('batches/:batchId/study-groups')
export class StudyGroupController {
  constructor(private readonly studyGroup: StudyGroupService) {}

  @BatchAccess('READ')
  @ApiOperation({ summary: 'List study groups (own groups for students, all for staff)' })
  @Get()
  listGroups(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.listGroups(batchId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Create a study group' })
  @Post()
  createGroup(
    @Param('batchId') batchId: string,
    @Body() dto: CreateStudyGroupDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.createGroup(batchId, dto, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Get a study group (members or staff only)' })
  @Get(':groupId')
  getGroup(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.getGroup(batchId, groupId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Join a study group' })
  @Post(':groupId/join')
  joinGroup(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.joinGroup(batchId, groupId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'List messages in a study group (members or staff)' })
  @Get(':groupId/messages')
  listMessages(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.listMessages(batchId, groupId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Send a message to a study group (members only)' })
  @Post(':groupId/messages')
  sendMessage(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @Body() dto: SendGroupMessageDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.sendMessage(batchId, groupId, dto, user);
  }

  @BatchAccess('MANAGE')
  @ApiOperation({ summary: 'Remove a group message (staff only)' })
  @Delete(':groupId/messages/:messageId')
  removeMessage(
    @Param('batchId') batchId: string,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() dto: RemoveGroupMessageDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.studyGroup.removeMessage(
      batchId,
      groupId,
      messageId,
      dto,
      user.userId,
    );
  }
}
