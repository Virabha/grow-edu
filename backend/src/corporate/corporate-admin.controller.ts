import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CorporateAdminService } from './corporate-admin.service';
import { AddSubGroupMemberDto } from './dto/add-sub-group-member.dto';
import { CreateSubGroupDto } from './dto/create-sub-group.dto';
import { IssueJoinLinkDto } from './dto/issue-join-link.dto';
import { JoinLinksService } from './join-links.service';
import { SubGroupsService } from './sub-groups.service';

@ApiTags('corporate')
@ApiBearerAuth()
@Controller('corporate/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CORPORATE_ADMIN)
export class CorporateAdminController {
  constructor(
    private readonly corporate: CorporateAdminService,
    private readonly joinLinks: JoinLinksService,
    private readonly subGroups: SubGroupsService,
  ) {}

  @ApiOperation({ summary: 'My organisation’s contracts and seat usage' })
  @Get('contracts')
  listMyContracts(@CurrentUser() user: { userId: string }) {
    return this.corporate.listMyContracts(user.userId);
  }

  @ApiOperation({ summary: 'The students of mine who have claimed a seat' })
  @Get('contracts/:contractId/roster')
  myRoster(
    @CurrentUser() user: { userId: string },
    @Param('contractId') contractId: string,
  ) {
    return this.corporate.myRoster(user.userId, contractId);
  }

  @ApiOperation({ summary: 'Issue a join link to distribute to my students' })
  @Post('contracts/:contractId/join-link')
  async issueJoinLink(
    @CurrentUser() user: { userId: string },
    @Param('contractId') contractId: string,
    @Body() dto: IssueJoinLinkDto,
  ) {
    await this.corporate.assertOwns(user.userId, contractId);
    return this.joinLinks.issue(contractId, dto, user.userId);
  }

  @ApiOperation({ summary: 'Revoke my live join links after a leak' })
  @HttpCode(HttpStatus.OK)
  @Delete('contracts/:contractId/join-link')
  async revokeJoinLinks(
    @CurrentUser() user: { userId: string },
    @Param('contractId') contractId: string,
  ) {
    await this.corporate.assertOwns(user.userId, contractId);
    return this.joinLinks.revokeAll(contractId, user.userId);
  }

  @ApiOperation({ summary: 'Create a sub-group for organising roster members' })
  @Post('contracts/:contractId/sub-groups')
  async createSubGroup(
    @CurrentUser() user: { userId: string },
    @Param('contractId') contractId: string,
    @Body() dto: CreateSubGroupDto,
  ) {
    await this.corporate.assertOwns(user.userId, contractId);
    return this.subGroups.create(contractId, dto.name, user.userId);
  }

  @ApiOperation({ summary: 'List sub-groups on a contract' })
  @Get('contracts/:contractId/sub-groups')
  async listSubGroups(
    @CurrentUser() user: { userId: string },
    @Param('contractId') contractId: string,
  ) {
    await this.corporate.assertOwns(user.userId, contractId);
    return this.subGroups.list(contractId);
  }

  @ApiOperation({ summary: 'Delete a sub-group' })
  @HttpCode(HttpStatus.OK)
  @Delete('contracts/:contractId/sub-groups/:subGroupId')
  async deleteSubGroup(
    @CurrentUser() user: { userId: string },
    @Param('contractId') contractId: string,
    @Param('subGroupId') subGroupId: string,
  ) {
    await this.corporate.assertOwns(user.userId, contractId);
    return this.subGroups.delete(subGroupId, contractId);
  }

  @ApiOperation({ summary: 'Add a roster member to a sub-group' })
  @Post('contracts/:contractId/sub-groups/:subGroupId/members')
  async addSubGroupMember(
    @CurrentUser() user: { userId: string },
    @Param('contractId') contractId: string,
    @Param('subGroupId') subGroupId: string,
    @Body() dto: AddSubGroupMemberDto,
  ) {
    await this.corporate.assertOwns(user.userId, contractId);
    return this.subGroups.addMember(subGroupId, contractId, dto.userId, user.userId);
  }

  @ApiOperation({ summary: 'Remove a roster member from a sub-group' })
  @HttpCode(HttpStatus.OK)
  @Delete('contracts/:contractId/sub-groups/:subGroupId/members/:userId')
  async removeSubGroupMember(
    @CurrentUser() user: { userId: string },
    @Param('contractId') contractId: string,
    @Param('subGroupId') subGroupId: string,
    @Param('userId') userId: string,
  ) {
    await this.corporate.assertOwns(user.userId, contractId);
    return this.subGroups.removeMember(subGroupId, contractId, userId);
  }
}
