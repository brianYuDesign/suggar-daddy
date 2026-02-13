import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { UserServiceClient } from './user-service.client';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('MatchingService', () => {
  let service: MatchingService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'sAdd' | 'sMembers' | 'sRem' | 'keys' | 'scan' | 'mget' | 'geoPos' | 'geoSearch' | 'geoAdd'>>;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;
  let userServiceClient: jest.Mocked<Pick<UserServiceClient, 'getCardsForRecommendation' | 'getCardsByIds'>>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      sAdd: jest.fn(),
      sMembers: jest.fn(),
      sRem: jest.fn(),
      keys: jest.fn(),
      scan: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
      geoPos: jest.fn().mockResolvedValue(null),
      geoSearch: jest.fn().mockResolvedValue([]),
      geoAdd: jest.fn().mockResolvedValue(0),
    };
    kafka = { sendEvent: jest.fn() };
    userServiceClient = {
      getCardsForRecommendation: jest.fn().mockResolvedValue([]),
      getCardsByIds: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
        { provide: UserServiceClient, useValue: userServiceClient },
      ],
    }).compile();

    service = module.get(MatchingService);
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('應回傳 ok 與 service 名稱', () => {
      const result = service.getHealth();
      expect(result).toEqual({ status: 'ok', service: 'matching-service' });
    });
  });

  describe('getCards', () => {
    it('應在無座標時 fallback 回傳未 swipe 過的卡片並排除自己', async () => {
      redis.geoPos!.mockResolvedValue(null);
      redis.sMembers!.mockResolvedValue(['user-3', 'user-5']);
      userServiceClient.getCardsForRecommendation!.mockResolvedValue([
        { id: 'user-1', displayName: 'A', avatarUrl: null },
        { id: 'user-2', displayName: 'B', avatarUrl: null },
        { id: 'user-3', displayName: 'C', avatarUrl: null },
      ] as any);
      const result = await service.getCards('user-0', 3);
      expect(result.cards.length).toBeLessThanOrEqual(3);
      expect(result.cards.every((c) => c.id !== 'user-0')).toBe(true);
      expect(result.cards.every((c) => c.id !== 'user-3' && c.id !== 'user-5')).toBe(true);
    });

    it('應使用 GEO 篩選回傳距離內的卡片', async () => {
      redis.geoPos!.mockResolvedValue({ longitude: 121.5, latitude: 25.0 });
      redis.sMembers!.mockResolvedValue([]);
      redis.geoSearch!.mockResolvedValue([
        { member: 'user-1', distance: 2.5 },
        { member: 'user-2', distance: 8.3 },
      ]);
      userServiceClient.getCardsByIds!.mockResolvedValue([
        { id: 'user-1', displayName: 'A', role: 'subscriber', verificationStatus: 'unverified', lastActiveAt: new Date() },
        { id: 'user-2', displayName: 'B', role: 'subscriber', verificationStatus: 'unverified', lastActiveAt: new Date() },
      ] as any);

      const result = await service.getCards('user-0', 10, undefined, 50);

      expect(redis.geoSearch).toHaveBeenCalledWith('geo:users', 121.5, 25.0, 50, expect.any(Number));
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].distance).toBe(2.5);
      expect(result.cards[1].distance).toBe(8.3);
    });

    it('應在 GEO 篩選中排除已 swipe 的用戶', async () => {
      redis.geoPos!.mockResolvedValue({ longitude: 121.5, latitude: 25.0 });
      redis.sMembers!.mockResolvedValue(['user-2']);
      redis.geoSearch!.mockResolvedValue([
        { member: 'user-1', distance: 2.5 },
        { member: 'user-2', distance: 5.0 },
        { member: 'user-3', distance: 8.3 },
      ]);
      userServiceClient.getCardsByIds!.mockResolvedValue([
        { id: 'user-1', displayName: 'A', role: 'subscriber', verificationStatus: 'unverified', lastActiveAt: new Date() },
        { id: 'user-3', displayName: 'C', role: 'subscriber', verificationStatus: 'unverified', lastActiveAt: new Date() },
      ] as any);

      const result = await service.getCards('user-0', 10, undefined, 50);

      // user-2 已被 swipe，不應出現
      expect(result.cards).toHaveLength(2);
      expect(result.cards.every((c) => c.id !== 'user-2')).toBe(true);
      // getCardsByIds 應只被傳入 user-1, user-3
      expect(userServiceClient.getCardsByIds).toHaveBeenCalledWith(['user-1', 'user-3']);
    });

    it('應限制 radius 在 1~500km 範圍內', async () => {
      redis.geoPos!.mockResolvedValue({ longitude: 121.5, latitude: 25.0 });
      redis.sMembers!.mockResolvedValue([]);
      redis.geoSearch!.mockResolvedValue([]);

      await service.getCards('user-0', 10, undefined, 9999);
      expect(redis.geoSearch).toHaveBeenCalledWith('geo:users', 121.5, 25.0, 500, expect.any(Number));

      jest.clearAllMocks();
      redis.geoPos!.mockResolvedValue({ longitude: 121.5, latitude: 25.0 });
      redis.sMembers!.mockResolvedValue([]);
      redis.geoSearch!.mockResolvedValue([]);

      await service.getCards('user-0', 10, undefined, -10);
      expect(redis.geoSearch).toHaveBeenCalledWith('geo:users', 121.5, 25.0, 1, expect.any(Number));
    });
  });

  describe('swipe', () => {
    it('應記錄 swipe 且無配對時回傳 matched: false', async () => {
      redis.get!.mockResolvedValue(null);
      redis.set!.mockResolvedValue(undefined);
      redis.sAdd!.mockResolvedValue(0);

      const result = await service.swipe('user-1', 'user-2', 'like');

      expect(result.matched).toBe(false);
      expect(redis.set).toHaveBeenCalled();
      expect(redis.sAdd).toHaveBeenCalled();
      expect(kafka.sendEvent).not.toHaveBeenCalled();
    });

    it('應在雙向 like 時建立配對並發送 Kafka', async () => {
      const _matchRecord = {
        id: 'match-1',
        userAId: 'user-2',
        userBId: 'user-1',
        matchedAt: new Date(),
        status: 'active',
      };
      redis.get!
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify({
          swiperId: 'user-2',
          swipedId: 'user-1',
          action: 'like',
          createdAt: new Date(),
        }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      redis.set!.mockResolvedValue(undefined);
      redis.sAdd!.mockResolvedValue(0);

      const result = await service.swipe('user-1', 'user-2', 'like');

      expect(result.matched).toBe(true);
      expect(result.matchId).toBeDefined();
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'matching.matched',
        expect.objectContaining({
          userAId: 'user-1',
          userBId: 'user-2',
        })
      );
    });
  });

  describe('getMatches', () => {
    it('應回傳空列表當無配對', async () => {
      redis.sMembers!.mockResolvedValue([]);
      redis.scan!.mockResolvedValue([]);
      redis.mget!.mockResolvedValue([]);

      const result = await service.getMatches('user-1', 10);

      expect(result.matches).toEqual([]);
    });
  });

  describe('unmatch', () => {
    it('應在找到配對時更新狀態並回傳 success: true', async () => {
      const matchRecord = {
        id: 'match-1',
        userAId: 'user-1',
        userBId: 'user-2',
        matchedAt: new Date(),
        status: 'active',
      };
      redis.scan!.mockResolvedValue(['match:user-1:user-2']);
      redis.mget!.mockResolvedValue([JSON.stringify(matchRecord)]);
      redis.set!.mockResolvedValue(undefined);
      redis.sRem!.mockResolvedValue(0);

      const result = await service.unmatch('user-1', 'match-1');

      expect(result.success).toBe(true);
      expect(redis.set).toHaveBeenCalledWith(
        'match:user-1:user-2',
        expect.stringContaining('"status":"unmatched"')
      );
    });

    it('應在非本人或找不到時回傳 success: false', async () => {
      redis.scan!.mockResolvedValue([]);
      redis.mget!.mockResolvedValue([]);

      const result = await service.unmatch('user-1', 'match-999');

      expect(result.success).toBe(false);
    });
  });
});
