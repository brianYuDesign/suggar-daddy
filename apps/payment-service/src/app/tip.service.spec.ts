import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TipService } from './tip.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { DiamondService } from './diamond.service';

describe('TipService', () => {
  let service: TipService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'lPush' | 'lRange' | 'lLen' | 'mget' | 'sAdd'>>;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;
  let diamondService: Record<string, jest.Mock>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      lPush: jest.fn(),
      lRange: jest.fn(),
      lLen: jest.fn().mockResolvedValue(0),
      mget: jest.fn().mockResolvedValue([]),
      sAdd: jest.fn(),
    };
    kafka = { sendEvent: jest.fn() };
    diamondService = {
      transferDiamonds: jest.fn().mockResolvedValue({ fromBalance: 900, toBalance: 100 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
        { provide: DiamondService, useValue: diamondService },
      ],
    }).compile();

    service = module.get(TipService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('應建立打賞記錄並發送 Kafka', async () => {
      redis.set!.mockResolvedValue(undefined);
      redis.lPush!.mockResolvedValue(0);

      const dto = {
        fromUserId: 'user-1',
        toUserId: 'user-2',
        amount: 500,
        message: 'Thanks!',
      };

      const result = await service.create(dto);

      expect(result.id).toMatch(/^tip-/);
      expect(result.fromUserId).toBe('user-1');
      expect(result.toUserId).toBe('user-2');
      expect(result.amount).toBe(500);
      expect(result.message).toBe('Thanks!');
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'payment.tip.sent',
        expect.objectContaining({
          senderId: 'user-1',
          recipientId: 'user-2',
          amount: 500,
        })
      );
    });
  });

  describe('findByFrom / findByTo', () => {
    it('應回傳打賞列表（分頁格式）', async () => {
      const tipJson = JSON.stringify({
        id: 'tip-1',
        fromUserId: 'u1',
        toUserId: 'u2',
        amount: 100,
        createdAt: new Date().toISOString(),
      });
      redis.lLen!.mockResolvedValue(1);
      redis.lRange!.mockResolvedValue(['tip-1']);
      redis.mget!.mockResolvedValue([tipJson]);

      const fromResult = await service.findByFrom('u1');
      expect(fromResult.data.length).toBe(1);
      expect(fromResult.data[0].amount).toBe(100);
      expect(fromResult.total).toBe(1);
      expect(fromResult.page).toBe(1);

      const toResult = await service.findByTo('u2');
      expect(toResult.data.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('應在找不到時拋出 NotFoundException', async () => {
      redis.get!.mockResolvedValue(null);

      await expect(service.findOne('tip-missing')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('tip-missing')).rejects.toThrow('Tip');
    });
  });
});
