import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DiamondService } from './diamond.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('DiamondService', () => {
  let service: DiamondService;
  let redis: Record<string, jest.Mock>;
  let redisClient: Record<string, jest.Mock>;
  let kafka: Record<string, jest.Mock>;

  beforeEach(async () => {
    redisClient = {
      eval: jest.fn(),
    };
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      lPush: jest.fn(),
      lRange: jest.fn(),
      mget: jest.fn().mockResolvedValue([]),
      getClient: jest.fn(() => redisClient),
    };
    kafka = {
      sendEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiamondService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(DiamondService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getBalance', () => {
    it('should return stored balance', async () => {
      const balance = {
        balance: 1000,
        totalPurchased: 2000,
        totalSpent: 800,
        totalReceived: 300,
        totalConverted: 500,
        updatedAt: '2026-01-01T00:00:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(balance));

      const result = await service.getBalance('user-1');
      expect(result).toEqual(balance);
      expect(redis.get).toHaveBeenCalledWith('diamond:user-1');
    });

    it('should return zero balance when no record exists', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getBalance('user-new');
      expect(result.balance).toBe(0);
      expect(result.totalPurchased).toBe(0);
      expect(result.totalSpent).toBe(0);
    });
  });

  describe('getDiamondHistory', () => {
    it('should return transaction history', async () => {
      const tx1 = { id: 'dt-1', type: 'spend', amount: -50, createdAt: '2026-01-01T00:00:00Z' };
      const tx2 = { id: 'dt-2', type: 'purchase', amount: 500, createdAt: '2026-01-01T01:00:00Z' };
      redis.lRange.mockResolvedValue([JSON.stringify(tx1), JSON.stringify(tx2)]);

      const result = await service.getDiamondHistory('user-1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('dt-1');
      expect(redis.lRange).toHaveBeenCalledWith('diamond:history:user-1', 0, 49);
    });

    it('should return empty array when no history', async () => {
      redis.lRange.mockResolvedValue([]);
      const result = await service.getDiamondHistory('user-1');
      expect(result).toHaveLength(0);
    });
  });

  describe('getConfig', () => {
    it('should return stored config', async () => {
      const config = { superLikeCost: 50, boostCost: 150 };
      redis.get.mockResolvedValue(JSON.stringify(config));

      const result = await service.getConfig();
      expect(result.superLikeCost).toBe(50);
    });

    it('should initialize default config when none exists', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getConfig();
      expect(result.superLikeCost).toBe(50);
      expect(result.boostCost).toBe(150);
      expect(result.conversionRate).toBe(100);
      expect(redis.set).toHaveBeenCalledWith('diamond:config', expect.any(String));
    });
  });

  describe('spendDiamonds', () => {
    it('should deduct diamonds and record history', async () => {
      redisClient.eval.mockResolvedValue(JSON.stringify({ ok: true, balance: 450 }));
      redis.lPush.mockResolvedValue(1);

      const result = await service.spendDiamonds('user-1', 50, 'super_like');
      expect(result.balance).toBe(450);
      expect(redisClient.eval).toHaveBeenCalledWith(
        expect.any(String), 1, 'diamond:user-1', '50', expect.any(String),
      );
      expect(redis.lPush).toHaveBeenCalledWith(
        'diamond:history:user-1',
        expect.stringContaining('"type":"spend"'),
      );
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'diamond.spent',
        expect.objectContaining({ userId: 'user-1', amount: 50 }),
      );
    });

    it('should throw when no balance exists', async () => {
      redisClient.eval.mockResolvedValue(JSON.stringify({ err: 'NO_BALANCE' }));

      await expect(service.spendDiamonds('user-1', 50, 'tip'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw when insufficient balance', async () => {
      redisClient.eval.mockResolvedValue(
        JSON.stringify({ err: 'INSUFFICIENT', balance: 30 }),
      );

      await expect(service.spendDiamonds('user-1', 50, 'tip'))
        .rejects.toThrow('Insufficient diamonds');
    });
  });

  describe('creditDiamonds', () => {
    it('should credit diamonds for purchase', async () => {
      redisClient.eval.mockResolvedValue(JSON.stringify({ ok: true, balance: 500 }));
      redis.lPush.mockResolvedValue(1);

      const result = await service.creditDiamonds('user-1', 500, 'purchase', 'dp-1', 'diamond_purchase');
      expect(result.balance).toBe(500);
      expect(redis.lPush).toHaveBeenCalledWith(
        'diamond:history:user-1',
        expect.stringContaining('"type":"purchase"'),
      );
    });

    it('should credit diamonds for received (tip)', async () => {
      redisClient.eval.mockResolvedValue(JSON.stringify({ ok: true, balance: 100 }));
      redis.lPush.mockResolvedValue(1);

      const result = await service.creditDiamonds('user-1', 100, 'received', 'tip-1', 'tip');
      expect(result.balance).toBe(100);
      expect(redis.lPush).toHaveBeenCalledWith(
        'diamond:history:user-1',
        expect.stringContaining('"type":"credit"'),
      );
    });
  });

  describe('transferDiamonds', () => {
    it('should transfer from sender to receiver', async () => {
      redisClient.eval.mockResolvedValue(
        JSON.stringify({ ok: true, fromBalance: 900, toBalance: 100 }),
      );
      redis.lPush.mockResolvedValue(1);

      const result = await service.transferDiamonds('sender', 'receiver', 100, 'tip', 'tip-1');
      expect(result.fromBalance).toBe(900);
      expect(result.toBalance).toBe(100);
      // Should record history for both sender and receiver
      expect(redis.lPush).toHaveBeenCalledTimes(2);
      expect(redis.lPush).toHaveBeenCalledWith(
        'diamond:history:sender',
        expect.stringContaining('"type":"transfer_out"'),
      );
      expect(redis.lPush).toHaveBeenCalledWith(
        'diamond:history:receiver',
        expect.stringContaining('"type":"transfer_in"'),
      );
    });

    it('should throw on insufficient sender balance', async () => {
      redisClient.eval.mockResolvedValue(
        JSON.stringify({ err: 'INSUFFICIENT', balance: 50 }),
      );

      await expect(service.transferDiamonds('sender', 'receiver', 100))
        .rejects.toThrow('Insufficient diamonds');
    });

    it('should throw when sender has no balance', async () => {
      redisClient.eval.mockResolvedValue(JSON.stringify({ err: 'NO_BALANCE' }));

      await expect(service.transferDiamonds('sender', 'receiver', 100))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('spendOnTip', () => {
    it('should transfer diamonds and return tipId', async () => {
      redisClient.eval.mockResolvedValue(
        JSON.stringify({ ok: true, fromBalance: 900, toBalance: 100 }),
      );
      redis.lPush.mockResolvedValue(1);

      const result = await service.spendOnTip('user-a', 'user-b', 100, 'post-1');
      expect(result.tipId).toMatch(/^tip-/);
      expect(result.fromBalance).toBe(900);
      expect(result.toBalance).toBe(100);
    });
  });

  describe('spendOnPostPurchase', () => {
    it('should transfer diamonds for PPV unlock', async () => {
      redisClient.eval.mockResolvedValue(
        JSON.stringify({ ok: true, fromBalance: 800, toBalance: 200 }),
      );
      redis.lPush.mockResolvedValue(1);

      const result = await service.spendOnPostPurchase('buyer', 'post-1', 200, 'creator');
      expect(result.purchaseId).toMatch(/^ppv-/);
      expect(result.buyerBalance).toBe(800);
    });
  });

  describe('spendOnSuperLike', () => {
    it('should spend configured cost', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ superLikeCost: 50, boostCost: 150, boostDurationMinutes: 30, conversionRate: 100, platformFeeRate: 0.2, minConversionDiamonds: 500 }),
      );
      redisClient.eval.mockResolvedValue(JSON.stringify({ ok: true, balance: 450 }));
      redis.lPush.mockResolvedValue(1);

      const result = await service.spendOnSuperLike('user-1');
      expect(result.cost).toBe(50);
      expect(result.balance).toBe(450);
    });
  });

  describe('spendOnBoost', () => {
    it('should spend configured boost cost and return expiry', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ superLikeCost: 50, boostCost: 150, boostDurationMinutes: 30, conversionRate: 100, platformFeeRate: 0.2, minConversionDiamonds: 500 }),
      );
      redisClient.eval.mockResolvedValue(JSON.stringify({ ok: true, balance: 350 }));
      redis.lPush.mockResolvedValue(1);

      const result = await service.spendOnBoost('user-1');
      expect(result.cost).toBe(150);
      expect(result.balance).toBe(350);
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('convertDiamondsToCash', () => {
    beforeEach(() => {
      redis.get.mockImplementation((key: string) => {
        if (key === 'diamond:config') {
          return Promise.resolve(JSON.stringify({
            superLikeCost: 50, boostCost: 150, boostDurationMinutes: 30,
            conversionRate: 100, platformFeeRate: 0.2, minConversionDiamonds: 500,
          }));
        }
        return Promise.resolve(null);
      });
    });

    it('should convert diamonds to cash with platform fee', async () => {
      redisClient.eval.mockResolvedValue(JSON.stringify({ ok: true, balance: 500 }));
      redis.lPush.mockResolvedValue(1);

      const result = await service.convertDiamondsToCash('user-1', 1000);
      // 1000 / 100 = $10 gross, * 0.8 (20% fee) = $8.00
      expect(result.cashAmount).toBe(8);
      expect(result.remainingDiamonds).toBe(500);
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'diamond.converted',
        expect.objectContaining({ userId: 'user-1', diamondAmount: 1000, cashAmount: 8 }),
      );
    });

    it('should throw when below minimum conversion', async () => {
      await expect(service.convertDiamondsToCash('user-1', 100))
        .rejects.toThrow('Minimum conversion is 500 diamonds');
    });

    it('should throw when insufficient diamonds for conversion', async () => {
      redisClient.eval.mockResolvedValue(
        JSON.stringify({ err: 'INSUFFICIENT', balance: 300 }),
      );

      await expect(service.convertDiamondsToCash('user-1', 500))
        .rejects.toThrow('Insufficient diamonds');
    });
  });
});
