import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DbWriterService } from './db-writer.service';
import { RedisService } from '@suggar-daddy/redis';
import {
  UserEntity,
  PostEntity,
  PostLikeEntity,
  PostCommentEntity,
  MediaFileEntity,
  SubscriptionEntity,
  SubscriptionTierEntity,
  TransactionEntity,
  TipEntity,
  PostPurchaseEntity,
} from '@suggar-daddy/database';

const mockRepo = () => ({
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findOne: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
});

describe('DbWriterService', () => {
  let service: DbWriterService;
  let moduleRef: TestingModule;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'del' | 'lPush'>>;

  beforeEach(async () => {
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn(), lPush: jest.fn() };

    moduleRef = await Test.createTestingModule({
      providers: [
        DbWriterService,
        { provide: getRepositoryToken(UserEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(PostEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(PostLikeEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(PostCommentEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(MediaFileEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(SubscriptionEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(SubscriptionTierEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(TransactionEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(TipEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(PostPurchaseEntity), useFactory: mockRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get(DbWriterService);
    jest.clearAllMocks();
  });

  describe('handleUserCreated', () => {
    it('應在 payload 完整時寫入 DB 與 Redis（passwordHash 從 Redis 讀取）', async () => {
      const userRepo = moduleRef.get(getRepositoryToken(UserEntity)) as any;
      userRepo.insert.mockResolvedValue(undefined);

      // auth-service 已在 register 時將 user 存入 Redis（含 passwordHash）
      redis.get!.mockResolvedValue(JSON.stringify({
        userId: 'user-1',
        email: 'test@x.com',
        passwordHash: 'hash-from-redis',
        displayName: 'Test',
        role: 'sugar_baby',
      }));

      await service.handleUserCreated({
        id: 'user-1',
        email: '  Test@X.com  ',
        displayName: 'Test',
        role: 'sugar_baby',
        bio: 'Hi',
        createdAt: new Date().toISOString(),
      });

      expect(redis.get).toHaveBeenCalledWith('user:user-1');
      expect(userRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'test@x.com',
          passwordHash: 'hash-from-redis',
          displayName: 'Test',
          role: 'sugar_baby',
        })
      );
      expect(redis.set).toHaveBeenCalledWith('user:user-1', expect.any(String));
      expect(redis.set).toHaveBeenCalledWith('user:email:test@x.com', 'user-1');
    });

    it('應在缺少必填欄位時不寫入', async () => {
      const userRepo = moduleRef.get(getRepositoryToken(UserEntity)) as any;

      await service.handleUserCreated({
        id: 'user-1',
        email: '',
        displayName: 'X',
      });

      expect(userRepo.insert).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('handlePostCreated', () => {
    it('應寫入 post 並更新 Redis 列表', async () => {
      const postRepo = moduleRef.get(getRepositoryToken(PostEntity)) as any;
      postRepo.insert.mockResolvedValue(undefined);

      await service.handlePostCreated({
        postId: 'post-1',
        creatorId: 'user-1',
        contentType: 'image',
        visibility: 'public',
        caption: 'Cap',
        mediaUrls: ['https://a/b.jpg'],
      });

      expect(postRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'post-1',
          creatorId: 'user-1',
          contentType: 'image',
          visibility: 'public',
        })
      );
      expect(redis.set).toHaveBeenCalledWith('post:post-1', expect.any(String));
      expect(redis.lPush).toHaveBeenCalledWith('posts:public:ids', 'post-1');
      expect(redis.lPush).toHaveBeenCalledWith('posts:creator:user-1', 'post-1');
    });

    it('應在缺少 postId/creatorId/contentType 時不寫入', async () => {
      const postRepo = moduleRef.get(getRepositoryToken(PostEntity)) as any;

      await service.handlePostCreated({
        postId: '',
        creatorId: 'u',
        contentType: 'image',
      });

      expect(postRepo.insert).not.toHaveBeenCalled();
    });
  });
});
