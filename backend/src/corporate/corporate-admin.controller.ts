import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CorporateAdminService } from './corporate-admin.service';
import { IssueJoinLinkDto } from './dto/issue-join-link.dto';
import { JoinLinksService } from './join-links.service';

@ApiTags('corporate')
@ApiBearerAuth()
@Controller('corporate/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CORPORATE_ADMIN)
export class CorporateAdminController {
  constructor(
    private readonly corporate: CorporateAdminService,
    private readonly joinLinks: JoinLinksService,
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
}
