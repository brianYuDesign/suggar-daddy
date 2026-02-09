import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('UserService', () => {
  let service: UserService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set'>>;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;

  const now = new Date();
  const userRecord = {
    id: 'user-1',
    role: 'sugar_baby',
    displayName: 'Alice',
    bio: 'Hi',
    avatarUrl: null,
    birthDate: undefined,
    preferences: {},
    verificationStatus: 'unverified',
    lastActiveAt: now,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    redis = { get: jest.fn(), set: jest.fn() };
    kafka = { sendEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(UserService);
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('應回傳當前用戶資料', async () => {
      redis.get!.mockResolvedValue(JSON.stringify({
        ...userRecord,
        lastActiveAt: userRecord.lastActiveAt.toISOString(),
        createdAt: userRecord.createdAt.toISOString(),
        updatedAt: userRecord.updatedAt.toISOString(),
      }));

      const result = await service.getMe('user-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-1');
      expect(result!.displayName).toBe('Alice');
      expect(redis.get).toHaveBeenCalledWith('user:user-1');
    });

    it('應在用戶不存在時回傳 null', async () => {
      redis.get!.mockResolvedValue(null);

      const result = await service.getMe('user-missing');

      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('應回傳指定用戶公開資料', async () => {
      redis.get!.mockResolvedValue(JSON.stringify({
        ...userRecord,
        lastActiveAt: userRecord.lastActiveAt.toISOString(),
        createdAt: userRecord.createdAt.toISOString(),
        updatedAt: userRecord.updatedAt.toISOString(),
      }));

      const result = await service.getProfile('user-1');

      expect(result!.id).toBe('user-1');
      expect(result!.displayName).toBe('Alice');
    });
  });

  describe('getCard', () => {
    it('應回傳用戶卡片格式', async () => {
      redis.get!.mockResolvedValue(JSON.stringify({
        ...userRecord,
        lastActiveAt: userRecord.lastActiveAt.toISOString(),
        createdAt: userRecord.createdAt.toISOString(),
        updatedAt: userRecord.updatedAt.toISOString(),
      }));

      const result = await service.getCard('user-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-1');
      expect(result!.displayName).toBe('Alice');
      expect(result!.role).toBe('sugar_baby');
    });

    it('應在用戶不存在時回傳 null', async () => {
      redis.get!.mockResolvedValue(null);
      expect(await service.getCard('user-missing')).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('應更新資料並發送 Kafka', async () => {
      redis.get!.mockResolvedValue(JSON.stringify({
        ...userRecord,
        lastActiveAt: userRecord.lastActiveAt.toISOString(),
        createdAt: userRecord.createdAt.toISOString(),
        updatedAt: userRecord.updatedAt.toISOString(),
      }));
      redis.set!.mockResolvedValue(undefined);

      const result = await service.updateProfile('user-1', {
        displayName: 'Alice Updated',
        bio: 'New bio',
      });

      expect(result.displayName).toBe('Alice Updated');
      expect(result.bio).toBe('New bio');
      expect(redis.set).toHaveBeenCalled();
      expect(kafka.sendEvent).toHaveBeenCalledWith('user.updated', expect.any(Object));
    });

    it('應在用戶不存在時拋出 NotFoundException', async () => {
      redis.get!.mockResolvedValue(null);

      await expect(
        service.updateProfile('user-missing', { displayName: 'X' })
      ).rejects.toThrow(NotFoundException);
      expect(kafka.sendEvent).not.toHaveBeenCalled();
    });
  });
});
