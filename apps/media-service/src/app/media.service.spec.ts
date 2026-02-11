import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MEDIA_EVENTS } from '@suggar-daddy/common';

describe('MediaService', () => {
  let service: MediaService;

  const redis = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    lPush: jest.fn().mockResolvedValue(1),
    lRange: jest.fn().mockResolvedValue([]),
  };

  const kafkaProducer = {
    sendEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafkaProducer },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('create', () => {
    it('should store in Redis, push to user list, and emit Kafka event', async () => {
      const payload = {
        userId: 'user-1',
        originalUrl: 'https://cdn.example.com/photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 54321,
      };

      const result = await service.create(payload);

      // Should have a generated id
      expect(result.id).toMatch(/^media-/);
      expect(result.userId).toBe('user-1');
      expect(result.originalUrl).toBe(payload.originalUrl);
      expect(result.fileName).toBe(payload.fileName);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.fileSize).toBe(54321);
      expect(result.createdAt).toBeDefined();

      // Should store in Redis
      expect(redis.set).toHaveBeenCalledWith(
        `media:${result.id}`,
        expect.any(String),
      );
      const storedJson = JSON.parse(redis.set.mock.calls[0][1]);
      expect(storedJson.id).toBe(result.id);
      expect(storedJson.userId).toBe('user-1');

      // Should push id to user list
      expect(redis.lPush).toHaveBeenCalledWith(
        'media:user:user-1',
        result.id,
      );

      // Should emit Kafka event
      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        MEDIA_EVENTS.MEDIA_UPLOADED,
        {
          mediaId: result.id,
          userId: 'user-1',
          storageUrl: payload.originalUrl,
          mimeType: 'image/jpeg',
          fileSize: 54321,
        },
      );
    });

    it('should use default fileType "image" when not specified', async () => {
      const payload = {
        userId: 'user-2',
        originalUrl: 'https://cdn.example.com/file.png',
        fileName: 'file.png',
      };

      const result = await service.create(payload);

      expect(result.fileType).toBe('image');
      expect(result.processingStatus).toBe('completed');
      expect(result.thumbnailUrl).toBeNull();
      expect(result.processedUrl).toBeNull();
      expect(result.mimeType).toBeNull();
      expect(result.fileSize).toBeNull();
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
      expect(result.duration).toBeNull();
      expect(result.metadata).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all media sorted by createdAt DESC', async () => {
      const media1 = {
        id: 'media-1',
        userId: 'user-1',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      const media2 = {
        id: 'media-2',
        userId: 'user-2',
        createdAt: '2024-06-01T00:00:00.000Z',
      };

      redis.keys.mockResolvedValueOnce(['media:media-1', 'media:media-2']);
      redis.get
        .mockResolvedValueOnce(JSON.stringify(media1))
        .mockResolvedValueOnce(JSON.stringify(media2));

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      // media2 has later createdAt, should come first
      expect(result[0].id).toBe('media-2');
      expect(result[1].id).toBe('media-1');
      expect(redis.keys).toHaveBeenCalledWith('media:media-*');
    });

    it('should return empty array when no keys', async () => {
      redis.keys.mockResolvedValueOnce([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByUser', () => {
    it('should return user media from Redis list', async () => {
      const media1 = {
        id: 'media-a',
        userId: 'user-1',
        createdAt: '2024-01-15T00:00:00.000Z',
      };
      const media2 = {
        id: 'media-b',
        userId: 'user-1',
        createdAt: '2024-03-20T00:00:00.000Z',
      };

      redis.lRange.mockResolvedValueOnce(['media-a', 'media-b']);
      redis.get
        .mockResolvedValueOnce(JSON.stringify(media1))
        .mockResolvedValueOnce(JSON.stringify(media2));

      const result = await service.findByUser('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('media-b');
      expect(result[1].id).toBe('media-a');
      expect(redis.lRange).toHaveBeenCalledWith('media:user:user-1', 0, -1);
    });
  });

  describe('findOne', () => {
    it('should return parsed media when found', async () => {
      const media = {
        id: 'media-abc',
        userId: 'user-1',
        originalUrl: 'https://cdn.example.com/pic.jpg',
        createdAt: '2024-05-10T00:00:00.000Z',
      };
      redis.get.mockResolvedValueOnce(JSON.stringify(media));

      const result = await service.findOne('media-abc');

      expect(result).toEqual(media);
      expect(redis.get).toHaveBeenCalledWith('media:media-abc');
    });

    it('should throw NotFoundException when not found', async () => {
      redis.get.mockResolvedValueOnce(null);

      await expect(service.findOne('media-nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('media-nonexistent')).rejects.toThrow(
        'Media media-nonexistent not found',
      );
    });
  });

  describe('remove', () => {
    it('should delete from Redis and emit Kafka event', async () => {
      const media = {
        id: 'media-del',
        userId: 'user-1',
        originalUrl: 'https://cdn.example.com/old.jpg',
        createdAt: '2024-02-01T00:00:00.000Z',
      };
      redis.get.mockResolvedValueOnce(JSON.stringify(media));

      await service.remove('media-del');

      expect(redis.del).toHaveBeenCalledWith('media:media-del');
      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        MEDIA_EVENTS.MEDIA_DELETED,
        {
          mediaId: 'media-del',
          userId: 'user-1',
          deletedAt: expect.any(String),
        },
      );
    });

    it('should throw NotFoundException when media not found', async () => {
      redis.get.mockResolvedValueOnce(null);

      await expect(service.remove('media-ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
