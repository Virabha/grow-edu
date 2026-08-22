import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateParentLinkDto } from './dto/create-parent-link.dto';
import { ParentLinkService } from './parent-link.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('parents')
@ApiBearerAuth()
@Controller('parents')
export class ParentLinkController {
  constructor(private readonly service: ParentLinkService) {}

  @Authenticated()
  @ApiOperation({ summary: 'Create a pending link request to monitor a student' })
  @Post('links')
  createLink(
    @CurrentUser() user: AuthedUser,
    @Body() dto: CreateParentLinkDto,
  ) {
    if (user.role !== 'PARENT') {
      throw new ForbiddenException('Only parent accounts can create links');
    }
    return this.service.createLink(user.userId, dto);
  }

  @Authenticated()
  @ApiOperation({ summary: 'List links for the calling parent account' })
  @Get('links')
  listLinks(@CurrentUser() user: AuthedUser) {
    if (user.role !== 'PARENT') {
      throw new ForbiddenException('Only parent accounts can list links');
    }
    return this.service.listLinks(user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: 'Revoke a parent link (either party may revoke)' })
  @Post('links/:linkId/revoke')
  revoke(
    @Param('linkId') linkId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.service.revoke(linkId, user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: 'Accept an incoming link request (student side)' })
  @Post('links/:linkId/accept')
  accept(
    @Param('linkId') linkId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.service.accept(linkId, user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: 'Reject an incoming link request (student side)' })
  @Post('links/:linkId/reject')
  reject(
    @Param('linkId') linkId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.service.reject(linkId, user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: 'List pending link requests directed at the signed-in student' })
  @Get('students/me/link-requests')
  listStudentRequests(@CurrentUser() user: AuthedUser) {
    return this.service.listStudentRequests(user.userId);
  }
}
