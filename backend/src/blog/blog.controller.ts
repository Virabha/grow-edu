import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';
import { BlogService } from './blog.service';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { ListBlogCategoriesDto } from './dto/list-blog-categories.dto';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { ListBlogPostsDto } from './dto/list-blog-posts.dto';
import { PublicListBlogPostsDto } from './dto/public-list-blog-posts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

class SchedulePostDto {
  @ApiProperty({ description: 'ISO 8601 datetime when the post should publish' })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt!: string;
}

@ApiTags('blog')
@Controller('blog')
@UseGuards(JwtAuthGuard)
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('categories')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List blog categories (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list of categories' })
  listCategories(@Query() query: ListBlogCategoriesDto) {
    return this.blogService.listCategories(query);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a blog category (admin)' })
  @ApiResponse({ status: 201, description: 'Created category' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  createCategory(@Body() dto: CreateBlogCategoryDto) {
    return this.blogService.createCategory(dto);
  }

  @Get('categories/:blogCategoryId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a blog category by ID (admin)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getCategory(@Param('blogCategoryId') blogCategoryId: string) {
    return this.blogService.getCategory(blogCategoryId);
  }

  @Patch('categories/:blogCategoryId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog category (admin)' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  updateCategory(@Param('blogCategoryId') blogCategoryId: string, @Body() dto: UpdateBlogCategoryDto) {
    return this.blogService.updateCategory(blogCategoryId, dto);
  }

  @Delete('categories/:blogCategoryId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a blog category (admin)' })
  @ApiResponse({ status: 409, description: 'Category has active posts' })
  deleteCategory(@Param('blogCategoryId') blogCategoryId: string) {
    return this.blogService.deleteCategory(blogCategoryId);
  }

  @Get('posts/public')
  @Public()
  @ApiOperation({ summary: 'List published blog posts (public)' })
  @ApiResponse({ status: 200, description: 'Paginated list of published posts' })
  listPublicPosts(@Query() query: PublicListBlogPostsDto) {
    return this.blogService.listPublicPosts(query);
  }

  @Get('posts/public/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a published blog post by slug (public); includes metadata; increments view count' })
  @ApiResponse({ status: 404, description: 'Not found or not published' })
  getPublicPost(@Param('slug') slug: string) {
    return this.blogService.getPublicPostBySlug(slug);
  }

  @Get('posts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List blog posts (admin)' })
  listPosts(@Query() query: ListBlogPostsDto) {
    return this.blogService.listPosts(query);
  }

  @Post('posts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a blog post (admin)' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  createPost(@Body() dto: CreateBlogPostDto) {
    return this.blogService.createPost(dto);
  }

  @Get('posts/:blogPostId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a blog post by ID (admin)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getPost(@Param('blogPostId') blogPostId: string) {
    return this.blogService.getPost(blogPostId);
  }

  @Patch('posts/:blogPostId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog post (admin)' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  updatePost(@Param('blogPostId') blogPostId: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.updatePost(blogPostId, dto);
  }

  @Post('posts/:blogPostId/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a blog post (explicit action)' })
  publishPost(@Param('blogPostId') blogPostId: string) {
    return this.blogService.publishPost(blogPostId);
  }

  @Post('posts/:blogPostId/unpublish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a blog post (returns it to DRAFT)' })
  unpublishPost(@Param('blogPostId') blogPostId: string) {
    return this.blogService.unpublishPost(blogPostId);
  }

  @Post('posts/:blogPostId/schedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Schedule a blog post for future publication' })
  async schedulePost(
    @Param('blogPostId') blogPostId: string,
    @Body() dto: SchedulePostDto,
  ) {
    const when = new Date(dto.scheduledAt);
    if (isNaN(when.getTime())) {
      throw new BadRequestException('scheduledAt is not a valid date');
    }
    return this.blogService.schedulePost(blogPostId, when);
  }

  @Delete('posts/:blogPostId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a blog post (admin)' })
  deletePost(@Param('blogPostId') blogPostId: string) {
    return this.blogService.deletePost(blogPostId);
  }
}
