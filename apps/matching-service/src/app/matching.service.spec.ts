import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('MatchingService', () => {
  let service: MatchingService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'sAdd' | 'sMembers' | 'sRem' | 'keys'>>;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      sAdd: jest.fn(),
      sMembers: jest.fn(),
      sRem: jest.fn(),
      keys: jest.fn(),
    };
    kafka = { sendEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
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
    it('應回傳未 swipe 過的卡片並排除自己', async () => {
      redis.sMembers!.mockResolvedValue(['user-3', 'user-5']);
      const result = await service.getCards('user-0', 3);
      expect(result.cards.length).toBeLessThanOrEqual(3);
      expect(result.cards.every((c) => c.id !== 'user-0')).toBe(true);
      expect(result.cards.every((c) => c.id !== 'user-3' && c.id !== 'user-5')).toBe(true);
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
      const matchRecord = {
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
      redis.keys!.mockResolvedValue([]);

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
      redis.keys!.mockResolvedValue(['match:user-1:user-2']);
      redis.get!.mockResolvedValue(JSON.stringify(matchRecord));
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
      redis.keys!.mockResolvedValue([]);

      const result = await service.unmatch('user-1', 'match-999');

      expect(result.success).toBe(false);
    });
  });
});
