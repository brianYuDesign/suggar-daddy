import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { CreatePostCommentDto } from './dto/post-comment.dto';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(@Body() createDto: CreatePostDto) {
    return this.postService.create(createDto);
  }

  @Get()
  findAll(@Query('creatorId') creatorId?: string) {
    if (creatorId) {
      return this.postService.findByCreator(creatorId);
    }
    return this.postService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePostDto) {
    return this.postService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postService.remove(id);
  }

  @Post(':id/like')
  like(@Param('id') id: string, @Body('userId') userId: string) {
    return this.postService.likePost(id, userId);
  }

  @Delete(':id/like')
  unlike(@Param('id') id: string, @Body('userId') userId: string) {
    return this.postService.unlikePost(id, userId);
  }

  @Post(':id/comments')
  createComment(@Param('id') id: string, @Body() createDto: CreatePostCommentDto) {
    return this.postService.createComment(id, createDto);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.postService.getComments(id);
  }
}
