import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { CreatePostCommentDto } from './dto/post-comment.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly postCommentRepository: Repository<PostComment>,
  ) {}

  async create(createDto: CreatePostDto): Promise<Post> {
    const post = this.postRepository.create(createDto);
    return this.postRepository.save(post);
  }

  async findAll(): Promise<Post[]> {
    return this.postRepository.find({
      where: { visibility: 'public' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async findByCreator(creatorId: string): Promise<Post[]> {
    return this.postRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }

  async update(id: string, updateDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    Object.assign(post, updateDto);
    return this.postRepository.save(post);
  }

  async remove(id: string): Promise<void> {
    const post = await this.findOne(id);
    await this.postRepository.remove(post);
  }

  async likePost(postId: string, userId: string): Promise<Post> {
    const post = await this.findOne(postId);
    
    const existingLike = await this.postLikeRepository.findOne({
      where: { postId, userId },
    });
    
    if (existingLike) {
      throw new ConflictException('Already liked this post');
    }

    const like = this.postLikeRepository.create({ postId, userId });
    await this.postLikeRepository.save(like);

    post.likeCount += 1;
    return this.postRepository.save(post);
  }

  async unlikePost(postId: string, userId: string): Promise<Post> {
    const post = await this.findOne(postId);
    
    const like = await this.postLikeRepository.findOne({
      where: { postId, userId },
    });
    
    if (!like) {
      throw new NotFoundException('Like not found');
    }

    await this.postLikeRepository.remove(like);

    post.likeCount = Math.max(0, post.likeCount - 1);
    return this.postRepository.save(post);
  }

  async createComment(postId: string, createDto: CreatePostCommentDto): Promise<PostComment> {
    const post = await this.findOne(postId);
    
    const comment = this.postCommentRepository.create({
      ...createDto,
      postId,
    });
    await this.postCommentRepository.save(comment);

    post.commentCount += 1;
    await this.postRepository.save(post);

    return comment;
  }

  async getComments(postId: string): Promise<PostComment[]> {
    await this.findOne(postId);
    
    return this.postCommentRepository.find({
      where: { postId },
      order: { createdAt: 'DESC' },
    });
  }
}
