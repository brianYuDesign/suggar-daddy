import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DmPurchaseService } from './dm-purchase.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { DiamondService } from './diamond.service';

describe('DmPurchaseService', () => {
  let service: DmPurchaseService;
  let redis: Record<string, jest.Mock>;
  let kafka: Record<string, jest.Mock>;
  let diamondService: Record<string, jest.Mock>;

  const mockCreator = (overrides = {}) => ({
    id: 'creator-1',
    displayName: 'Creator',
    dmPrice: 50,
    ...overrides,
  });

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      exists: jest.fn().mockResolvedValue(false),
      setPermanent: jest.fn().mockResolvedValue(undefined),
    };
    kafka = { sendEvent: jest.fn().mockResolvedValue(undefined) };
    diamondService = {
      spendOnDmUnlock: jest.fn().mockResolvedValue({ purchaseId: 'dmp-1', buyerBalance: 450 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DmPurchaseService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
        { provide: DiamondService, useValue: diamondService },
      ],
    }).compile();

    service = module.get(DmPurchaseService);
    jest.clearAllMocks();
  });

  describe('purchaseDmAccess', () => {
    it('應成功購買 DM 存取權', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockCreator()));
      redis.exists.mockResolvedValue(false);

      const result = await service.purchaseDmAccess('buyer-1', 'creator-1');

      expect(result.purchaseId).toMatch(/^dmp-/);
      expect(diamondService.spendOnDmUnlock).toHaveBeenCalledWith(
        'buyer-1', 'creator-1', 50,
      );
      expect(redis.setPermanent).toHaveBeenCalled();
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'messaging.dm.purchased',
        expect.objectContaining({ buyerId: 'buyer-1', creatorId: 'creator-1', amount: 50 }),
      );
    });

    it('應拋出 BadRequestException 當創作者不存在時', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.purchaseDmAccess('buyer-1', 'missing'))
        .rejects.toThrow(BadRequestException);
    });

    it('應拋出 BadRequestException 當創作者未開啟付費 DM 時', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockCreator({ dmPrice: 0 })));

      await expect(service.purchaseDmAccess('buyer-1', 'creator-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('應拋出 BadRequestException 當 dmPrice 為 null 時', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockCreator({ dmPrice: null })));

      await expect(service.purchaseDmAccess('buyer-1', 'creator-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('應拋出 ConflictException 當已購買時', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockCreator()));
      redis.exists.mockResolvedValue(true);

      await expect(service.purchaseDmAccess('buyer-1', 'creator-1'))
        .rejects.toThrow(ConflictException);
    });

    it('Kafka 發送失敗不應影響購買結果', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockCreator()));
      redis.exists.mockResolvedValue(false);
      kafka.sendEvent.mockRejectedValue(new Error('Kafka down'));

      const result = await service.purchaseDmAccess('buyer-1', 'creator-1');

      expect(result.purchaseId).toBeDefined();
      expect(redis.setPermanent).toHaveBeenCalled();
    });
  });
});
