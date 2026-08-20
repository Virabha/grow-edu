import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CancelContractDto } from './dto/cancel-contract.dto';
import { IssueJoinLinkDto } from './dto/issue-join-link.dto';
import { ListContractsDto } from './dto/list-contracts.dto';
import { JoinLinksService } from './join-links.service';
import { RecordContractPaymentDto } from './dto/record-contract-payment.dto';
import { ReleaseSeatDto } from './dto/release-seat.dto';
import { SeatsService } from './seats.service';
import { SetContractBatchesDto } from './dto/set-contract-batches.dto';

@ApiTags('corporate')
@ApiBearerAuth()
@Controller('corporate/contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractsController {
  constructor(
    private readonly contracts: ContractsService,
    private readonly joinLinks: JoinLinksService,
    private readonly seats: SeatsService,
  ) {}

  @ApiOperation({ summary: 'Record a corporate contract' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post()
  create(
    @Body() dto: CreateContractDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.contracts.create(dto, user.userId);
  }

  @ApiOperation({ summary: 'List corporate contracts, newest expiry first' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get()
  list(@Query() query: ListContractsDto) {
    return this.contracts.list(query);
  }

  @ApiOperation({ summary: 'Read a corporate contract' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get(':contractId')
  findOne(@Param('contractId') contractId: string) {
    return this.contracts.findOne(contractId);
  }

  @ApiOperation({ summary: 'Set the batches a contract’s seats may be spent on' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Put(':contractId/batches')
  setBatches(
    @Param('contractId') contractId: string,
    @Body() dto: SetContractBatchesDto,
  ) {
    return this.contracts.setBatches(contractId, dto.batchIds);
  }

  @ApiOperation({ summary: 'Record a corporate payment against a contract' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(':contractId/payment')
  recordPayment(
    @Param('contractId') contractId: string,
    @Body() dto: RecordContractPaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.contracts.recordPayment(contractId, dto, user.userId);
  }

  @ApiOperation({ summary: 'Cancel a contract' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post(':contractId/cancel')
  cancel(
    @Param('contractId') contractId: string,
    @Body() dto: CancelContractDto,
  ) {
    return this.contracts.cancel(contractId, dto.reason);
  }

  @ApiOperation({ summary: 'Issue a join link for a contract' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(':contractId/join-link')
  issueJoinLink(
    @Param('contractId') contractId: string,
    @Body() dto: IssueJoinLinkDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.joinLinks.issue(contractId, dto, user.userId);
  }

  @ApiOperation({ summary: 'Revoke every live join link on a contract' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(':contractId/join-link')
  revokeJoinLinks(
    @Param('contractId') contractId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.joinLinks.revokeAll(contractId, user.userId);
  }

  @ApiOperation({ summary: 'List the join links issued for a contract' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get(':contractId/join-link')
  listJoinLinks(@Param('contractId') contractId: string) {
    return this.joinLinks.listFor(contractId);
  }

  @ApiOperation({ summary: 'Reclaim a seat so the college can reassign it' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(':contractId/seats/:userId')
  releaseSeat(
    @Param('contractId') contractId: string,
    @Param('userId') userId: string,
    @Body() dto: ReleaseSeatDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.seats.release(contractId, userId, user.userId, dto.reason);
  }
}
