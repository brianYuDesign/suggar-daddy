import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { SwipeService } from './swipe.service';
import { DiscoveryService } from './discovery.service';
import { PaymentServiceClient } from './payment-service.client';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('MatchingService', () => {
  let service: MatchingService;
  let redis: jest.Mocked<
    Pick<
      RedisService,
      | 'get'
      | 'set'
      | 'sAdd'
      | 'sMembers'
      | 'sRem'
      | 'keys'
      | 'scan'
      | 'mget'
      | 'geoPos'
      | 'geoSearch'
      | 'geoAdd'
      | 'incr'
      | 'expire'
      | 'setex'
    >
  >;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;
  let swipeService: jest.Mocked<Pick<SwipeService, 'swipe' | 'undo'>>;
  let discoveryService: jest.Mocked<
    Pick<DiscoveryService, 'getCards' | 'getCardDetail'>
  >;

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
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(true),
      setex: jest.fn().mockResolvedValue(undefined),
    };
    kafka = { sendEvent: jest.fn().mockResolvedValue(undefined) };
    swipeService = {
      swipe: jest.fn(),
      undo: jest.fn(),
    };
    discoveryService = {
      getCards: jest.fn(),
      getCardDetail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
        { provide: PaymentServiceClient, useValue: {} },
        { provide: SwipeService, useValue: swipeService },
        { provide: DiscoveryService, useValue: discoveryService },
      ],
    }).compile();

    service = module.get(MatchingService);
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should return ok with service name', () => {
      const result = service.getHealth();
      expect(result).toEqual({ status: 'ok', service: 'matching-service' });
    });
  });

  describe('getCards (delegated to DiscoveryService)', () => {
    it('should delegate to discoveryService.getCards', async () => {
      discoveryService.getCards.mockResolvedValue({
        cards: [],
        nextCursor: undefined,
      });

      const result = await service.getCards('user-0', 20);

      expect(discoveryService.getCards).toHaveBeenCalledWith('user-0', {
        limit: 20,
        cursor: undefined,
        radius: undefined,
      });
      expect(result.cards).toEqual([]);
    });

    it('should pass radius and cursor to discoveryService', async () => {
      discoveryService.getCards.mockResolvedValue({
        cards: [],
        nextCursor: undefined,
      });

      await service.getCards('user-0', 10, 'cursor-1', 50);

      expect(discoveryService.getCards).toHaveBeenCalledWith('user-0', {
        limit: 10,
        cursor: 'cursor-1',
        radius: 50,
      });
    });
  });

  describe('swipe (delegated to SwipeService)', () => {
    it('should delegate to swipeService.swipe and return result', async () => {
      swipeService.swipe.mockResolvedValue({ matched: false });

      const result = await service.swipe('user-1', 'user-2', 'like');

      expect(result.matched).toBe(false);
      expect(swipeService.swipe).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        'like',
      );
    });

    it('should return match result from swipeService', async () => {
      swipeService.swipe.mockResolvedValue({
        matched: true,
        matchId: 'match-123',
      });

      const result = await service.swipe('user-1', 'user-2', 'like');

      expect(result.matched).toBe(true);
      expect(result.matchId).toBe('match-123');
    });
  });

  describe('getMatches', () => {
    it('should return empty list when no matches', async () => {
      redis.sMembers!.mockResolvedValue([]);

      const result = await service.getMatches('user-1', 10);

      expect(result.matches).toEqual([]);
    });
  });

  describe('unmatch', () => {
    it('should update match status and return success when match found', async () => {
      const matchRecord = {
        id: 'match-1',
        userAId: 'user-1',
        userBId: 'user-2',
        matchedAt: new Date(),
        status: 'active',
      };
      redis.sMembers!.mockResolvedValue(['match-1']);
      redis.get!.mockResolvedValue(null);
      redis.scan!.mockResolvedValue(['match:user-1:user-2']);
      redis.mget!.mockResolvedValue([JSON.stringify(matchRecord)]);
      redis.set!.mockResolvedValue(undefined);
      redis.sRem!.mockResolvedValue(0);

      const result = await service.unmatch('user-1', 'match-1');

      expect(result.success).toBe(true);
      expect(redis.set).toHaveBeenCalledWith(
        'match:user-1:user-2',
        expect.stringContaining('"status":"unmatched"'),
      );
    });

    it('should return success: false when match not in user matches', async () => {
      redis.sMembers!.mockResolvedValue([]);

      const result = await service.unmatch('user-1', 'match-999');

      expect(result.success).toBe(false);
    });
  });
});
