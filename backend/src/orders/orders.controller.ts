import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { ListOrdersDto } from './dto/list-orders.dto';
import { AdminListOrdersDto } from './dto/admin-list-orders.dto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { ResolveRefundDto } from './dto/resolve-refund.dto';

@ApiTags('orders')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: "List the caller's own orders, newest first" })
  @ApiResponse({ status: 200 })
  @Get('orders')
  listOrders(
    @CurrentUser() user: { userId: string },
    @Query() dto: ListOrdersDto,
  ) {
    return this.ordersService.listOrders(user.userId, dto);
  }

  @ApiOperation({ summary: "Get one of the caller's orders (404 for another user's order)" })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @Get('orders/:orderId')
  getOrder(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.getOrder(orderId, user.userId);
  }

  @ApiOperation({ summary: 'Request a refund for a completed order' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 409 })
  @Post('orders/:orderId/refund-request')
  requestRefund(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
    @Body() dto: RequestRefundDto,
  ) {
    return this.ordersService.requestRefund(orderId, user.userId, dto);
  }

  @ApiOperation({ summary: 'Admin: list all orders, paginated, filterable by status / buyer' })
  @ApiResponse({ status: 200 })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get('admin/orders')
  adminListOrders(@Query() dto: AdminListOrdersDto) {
    return this.ordersService.adminListOrders(dto);
  }

  @ApiOperation({ summary: 'Admin: full order detail including proof URL and transaction id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get('admin/orders/:orderId')
  adminGetOrder(@Param('orderId') orderId: string) {
    return this.ordersService.adminGetOrder(orderId);
  }

  @ApiOperation({ summary: 'Admin: approve or decline a pending refund request' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 404 })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Patch('admin/orders/:orderId/refund')
  adminResolveRefund(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
    @Body() dto: ResolveRefundDto,
  ) {
    return this.ordersService.adminResolveRefund(orderId, user.userId, dto);
  }
}
