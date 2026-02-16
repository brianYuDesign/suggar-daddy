import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionManagementService } from './subscription-management.service';
import {
  SubscriptionEntity,
  SubscriptionTierEntity,
  UserEntity,
} from '@suggar-daddy/database';

describe('SubscriptionManagementService', () => {
  let service: SubscriptionManagementService;
  let subscriptionRepo: Record<string, jest.Mock>;
  let tierRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;

  const mockSubQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockTierQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(null),
  };

  const mockUserQb = {
    select: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    subscriptionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockSubQb),
      count: jest.fn().mockResolvedValue(0),
    };
    tierRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTierQb),
      findBy: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockUserQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionManagementService,
        { provide: getRepositoryToken(SubscriptionEntity), useValue: subscriptionRepo },
        { provide: getRepositoryToken(SubscriptionTierEntity), useValue: tierRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
      ],
    }).compile();

    service = module.get(SubscriptionManagementService);

    // Reset mock chain methods
    jest.clearAllMocks();
    mockSubQb.where.mockReturnThis();
    mockSubQb.orderBy.mockReturnThis();
    mockSubQb.skip.mockReturnThis();
    mockSubQb.take.mockReturnThis();
    mockSubQb.getManyAndCount.mockResolvedValue([[], 0]);
    mockSubQb.select.mockReturnThis();
    mockSubQb.addSelect.mockReturnThis();
    mockSubQb.groupBy.mockReturnThis();
    mockSubQb.getRawMany.mockResolvedValue([]);
    mockTierQb.where.mockReturnThis();
    mockTierQb.orderBy.mockReturnThis();
    mockTierQb.skip.mockReturnThis();
    mockTierQb.take.mockReturnThis();
    mockTierQb.getManyAndCount.mockResolvedValue([[], 0]);
    mockTierQb.innerJoin.mockReturnThis();
    mockTierQb.select.mockReturnThis();
    mockTierQb.addSelect.mockReturnThis();
    mockTierQb.getRawOne.mockResolvedValue(null);
    mockUserQb.select.mockReturnThis();
    mockUserQb.whereInIds.mockReturnThis();
    mockUserQb.getMany.mockResolvedValue([]);
  });

  describe('listSubscriptions', () => {
    it('應回傳分頁訂閱列表', async () => {
      mockSubQb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.listSubscriptions(1, 10);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });

    it('應附帶使用者和方案資訊', async () => {
      const sub = {
        id: 'sub-1',
        subscriberId: 'user-1',
        creatorId: 'creator-1',
        tierId: 'tier-1',
        status: 'active',
        createdAt: new Date(),
        cancelledAt: null,
        currentPeriodEnd: new Date(),
      };
      mockSubQb.getManyAndCount.mockResolvedValue([[sub], 1]);
      mockUserQb.getMany.mockResolvedValue([
        { id: 'user-1', email: 'u@test.com', displayName: 'User', avatarUrl: null },
        { id: 'creator-1', email: 'c@test.com', displayName: 'Creator', avatarUrl: null },
      ]);
      tierRepo.findBy.mockResolvedValue([
        { id: 'tier-1', name: 'Gold', priceMonthly: 9.99 },
      ]);

      const result = await service.listSubscriptions(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].subscriber).toEqual(expect.objectContaining({ id: 'user-1' }));
      expect(result.data[0].creator).toEqual(expect.objectContaining({ id: 'creator-1' }));
      expect(result.data[0].tier).toEqual(expect.objectContaining({ id: 'tier-1' }));
    });

    it('應支援狀態篩選', async () => {
      mockSubQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listSubscriptions(1, 10, 'active');

      expect(mockSubQb.where).toHaveBeenCalledWith('sub.status = :status', { status: 'active' });
    });
  });

  describe('getSubscriptionStats', () => {
    it('應回傳訂閱統計', async () => {
      subscriptionRepo.count
        .mockResolvedValueOnce(100)   // active
        .mockResolvedValueOnce(20)    // cancelled
        .mockResolvedValueOnce(5)     // expired
        .mockResolvedValueOnce(125);  // total
      mockTierQb.getRawOne.mockResolvedValue({ mrr: '999.99' });

      const result = await service.getSubscriptionStats();

      expect(result.totalActive).toBe(100);
      expect(result.totalCancelled).toBe(20);
      expect(result.totalExpired).toBe(5);
      expect(result.total).toBe(125);
      expect(result.mrr).toBe(999.99);
    });

    it('無訂閱時 MRR 應為 0', async () => {
      subscriptionRepo.count.mockResolvedValue(0);
      mockTierQb.getRawOne.mockResolvedValue(null);

      const result = await service.getSubscriptionStats();

      expect(result.mrr).toBe(0);
    });
  });

  describe('listTiers', () => {
    it('應回傳分頁方案列表', async () => {
      mockTierQb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.listTiers(1, 10);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });

    it('應附帶創作者資訊和訂閱數', async () => {
      const tier = {
        id: 'tier-1',
        creatorId: 'creator-1',
        name: 'Gold',
        description: 'Gold tier',
        priceMonthly: 9.99,
        priceYearly: null,
        benefits: [],
        isActive: true,
        createdAt: new Date(),
      };
      mockTierQb.getManyAndCount.mockResolvedValue([[tier], 1]);
      mockUserQb.getMany.mockResolvedValue([
        { id: 'creator-1', email: 'c@test.com', displayName: 'Creator' },
      ]);
      mockSubQb.getRawMany.mockResolvedValue([
        { tierId: 'tier-1', count: '42' },
      ]);

      const result = await service.listTiers(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].activeSubscribers).toBe(42);
      expect(result.data[0].creator).toEqual(expect.objectContaining({ id: 'creator-1' }));
    });
  });

  describe('toggleTierActive', () => {
    it('應切換方案啟用狀態', async () => {
      const tier = { id: 'tier-1', isActive: true };
      tierRepo.findOne.mockResolvedValue(tier);

      const result = await service.toggleTierActive('tier-1');

      expect(result.success).toBe(true);
      expect(result.isActive).toBe(false);
      expect(tierRepo.save).toHaveBeenCalled();
    });

    it('已停用的方案應切換為啟用', async () => {
      const tier = { id: 'tier-1', isActive: false };
      tierRepo.findOne.mockResolvedValue(tier);

      const result = await service.toggleTierActive('tier-1');

      expect(result.isActive).toBe(true);
    });

    it('找不到方案時應拋出 NotFoundException', async () => {
      tierRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleTierActive('tier-missing'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
