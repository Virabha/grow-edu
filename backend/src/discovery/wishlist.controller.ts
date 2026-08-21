import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

interface AuthedUser { userId: string; role: string; }

@Controller('me/wishlist')
@Authenticated()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.wishlistService.list(user.userId);
  }

  @Post(':batchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  save(
    @CurrentUser() user: AuthedUser,
    @Param('batchId') batchId: string,
  ) {
    return this.wishlistService.save(user.userId, batchId);
  }

  @Delete(':batchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthedUser,
    @Param('batchId') batchId: string,
  ) {
    return this.wishlistService.remove(user.userId, batchId);
  }
}
