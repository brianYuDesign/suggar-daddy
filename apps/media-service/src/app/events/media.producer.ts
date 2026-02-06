import { Injectable, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { MEDIA_EVENTS, MediaUploadedEvent } from '@suggar-daddy/common';

@Injectable()
export class MediaProducer {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async emitMediaUploaded(event: MediaUploadedEvent) {
    return this.kafkaClient.emit(MEDIA_EVENTS.MEDIA_UPLOADED, event);
  }

  async emitMediaDeleted(mediaId: string, userId: string) {
    return this.kafkaClient.emit(MEDIA_EVENTS.MEDIA_DELETED, {
      mediaId,
      userId,
      deletedAt: new Date(),
    });
  }

  async emitMediaProcessed(
    mediaId: string,
    thumbnailUrl: string,
    metadata: any,
  ) {
    return this.kafkaClient.emit(MEDIA_EVENTS.MEDIA_PROCESSED, {
      mediaId,
      thumbnailUrl,
      metadata,
      processedAt: new Date(),
    });
  }
}