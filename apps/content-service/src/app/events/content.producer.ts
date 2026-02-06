import { Injectable, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CONTENT_EVENTS, PostCreatedEvent } from '@suggar-daddy/common';

@Injectable()
export class ContentProducer {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async emitPostCreated(event: PostCreatedEvent) {
    return this.kafkaClient.emit(CONTENT_EVENTS.POST_CREATED, event);
  }

  async emitPostUpdated(postId: string, data: any) {
    return this.kafkaClient.emit(CONTENT_EVENTS.POST_UPDATED, {
      postId,
      ...data,
      updatedAt: new Date(),
    });
  }

  async emitPostDeleted(postId: string, creatorId: string) {
    return this.kafkaClient.emit(CONTENT_EVENTS.POST_DELETED, {
      postId,
      creatorId,
      deletedAt: new Date(),
    });
  }

  async emitPostLiked(postId: string, userId: string) {
    return this.kafkaClient.emit(CONTENT_EVENTS.POST_LIKED, {
      postId,
      userId,
      likedAt: new Date(),
    });
  }

  async emitPostUnliked(postId: string, userId: string) {
    return this.kafkaClient.emit(CONTENT_EVENTS.POST_UNLIKED, {
      postId,
      userId,
      unlikedAt: new Date(),
    });
  }

  async emitCommentCreated(
    postId: string,
    commentId: string,
    userId: string,
    content: string,
  ) {
    return this.kafkaClient.emit(CONTENT_EVENTS.COMMENT_CREATED, {
      postId,
      commentId,
      userId,
      content,
      createdAt: new Date(),
    });
  }
}