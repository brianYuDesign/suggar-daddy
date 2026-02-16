import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { CreatePostCommentDto } from './dto/post-comment.dto';
import { JwtAuthGuard, OptionalJwtGuard, CurrentUser, Public, type CurrentUserData } from '@suggar-daddy/auth';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserData, @Body() createDto: CreatePostDto) {
    return this.postService.create({ ...createDto, creatorId: user.userId });
  }

  // ── IMPORTANT: specific routes MUST come BEFORE :id routes ────

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  getBookmarks(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.postService.getBookmarks(user.userId, Number(page) || 1, Math.min(Number(limit) || 20, 100));
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  @Public()
  findAll(
    @Query('creatorId') creatorId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @CurrentUser() user?: CurrentUserData
  ) {
    const p = Number(page) || 1;
    const l = Math.min(Number(limit) || 20, 100);
    if (creatorId) {
      return this.postService.findByCreatorWithAccess(creatorId, user?.userId, p, l);
    }
    return this.postService.findAll(p, l, user?.userId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @Public()
  findOne(@Param('id') id: string, @CurrentUser() user?: CurrentUserData) {
    return this.postService.findOneWithAccess(id, user?.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateDto: UpdatePostDto
  ) {
    const post = await this.postService.findOne(id);
    if (post.creatorId !== user.userId) {
      throw new ForbiddenException('Only the creator can update this post');
    }
    return this.postService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const post = await this.postService.findOne(id);
    if (post.creatorId !== user.userId) {
      throw new ForbiddenException('Only the creator can delete this post');
    }
    return this.postService.remove(id);
  }

  // ── Likes ─────────────────────────────────────────────────────

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  like(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.postService.likePost(id, user.userId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  unlike(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.postService.unlikePost(id, user.userId);
  }

  // ── Bookmarks ─────────────────────────────────────────────────

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  bookmark(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.postService.bookmarkPost(id, user.userId);
  }

  @Delete(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  unbookmark(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.postService.unbookmarkPost(id, user.userId);
  }

  // ── Comments ──────────────────────────────────────────────────

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() createDto: CreatePostCommentDto
  ) {
    return this.postService.createComment(id, { ...createDto, userId: user.userId });
  }

  @Get(':id/comments')
  @UseGuards(OptionalJwtGuard)
  @Public()
  getComments(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.postService.getComments(id, Number(page) || 1, Math.min(Number(limit) || 20, 100), user?.userId);
  }

  @Delete(':postId/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @CurrentUser() user: CurrentUserData,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.postService.deleteComment(postId, commentId, user.userId);
  }

  @Get(':postId/comments/:commentId/replies')
  @Public()
  getCommentReplies(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.postService.getCommentReplies(postId, commentId, Number(page) || 1, Math.min(Number(limit) || 20, 100));
  }
}
