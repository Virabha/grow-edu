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
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
import { RemoveFeedPostDto } from './dto/remove-feed-post.dto';
import { FeedService } from './feed.service';

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags('community')
@ApiBearerAuth()
@Controller('batches/:batchId/feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @BatchAccess('READ')
  @ApiOperation({ summary: 'List top-level feed posts' })
  @Get()
  listPosts(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.listPosts(batchId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Create a top-level feed post' })
  @Post()
  createPost(
    @Param('batchId') batchId: string,
    @Body() dto: CreateFeedPostDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.createPost(batchId, dto, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'List replies to a feed post' })
  @Get(':postId/replies')
  listReplies(
    @Param('batchId') batchId: string,
    @Param('postId') postId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.listReplies(batchId, postId, user);
  }

  @BatchAccess('READ')
  @ApiOperation({ summary: 'Reply to a feed post' })
  @Post(':postId/replies')
  createReply(
    @Param('batchId') batchId: string,
    @Param('postId') postId: string,
    @Body() dto: CreateFeedPostDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.createReply(batchId, postId, dto, user);
  }

  @BatchAccess('MANAGE')
  @ApiOperation({ summary: 'Remove a feed post (staff only)' })
  @Delete(':postId')
  removePost(
    @Param('batchId') batchId: string,
    @Param('postId') postId: string,
    @Body() dto: RemoveFeedPostDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.feed.removePost(batchId, postId, dto, user.userId);
  }
}
