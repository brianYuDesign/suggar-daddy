import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import {
  UserEntity,
  PostEntity,
  TipEntity,
  SubscriptionEntity,
} from '@suggar-daddy/database';
import { RedisService } from '@suggar-daddy/redis';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let redis: jest.Mocked<
    Pick<RedisService, 'setex' | 'get' | 'getClient'>
  >;
  let userRepo: Record<string, jest.Mock>;
  let postRepo: Record<string, jest.Mock>;
  let tipRepo: Record<string, jest.Mock>;
  let subscriptionRepo: Record<string, jest.Mock>;

  const mockScard = jest.fn();
  const mockSunionstore = jest.fn();
  const mockDel = jest.fn();

  const mockPostQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockTipQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockSubQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    redis = {
      setex: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      getClient: jest.fn().mockReturnValue({
        scard: mockScard,
        sunionstore: mockSunionstore,
        del: mockDel,
      }) as any,
    };

    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    postRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockPostQb),
    };

    tipRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTipQb),
    };

    subscriptionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockSubQb),
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(PostEntity), useValue: postRepo },
        { provide: getRepositoryToken(TipEntity), useValue: tipRepo },
        { provide: getRepositoryToken(SubscriptionEntity), useValue: subscriptionRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();

    // 恢復預設的 mock 行為
    redis.setex.mockResolvedValue(undefined);
    redis.get.mockResolvedValue(null);
    redis.getClient.mockReturnValue({
      scard: mockScard,
      sunionstore: mockSunionstore,
      del: mockDel,
    } as any);
    mockScard.mockResolvedValue(0);
    mockSunionstore.mockResolvedValue(0);
    mockDel.mockResolvedValue(1);

    userRepo.findOne.mockResolvedValue(null);
    postRepo.createQueryBuilder.mockReturnValue(mockPostQb);
    tipRepo.createQueryBuilder.mockReturnValue(mockTipQb);
    subscriptionRepo.createQueryBuilder.mockReturnValue(mockSubQb);
    subscriptionRepo.count.mockResolvedValue(0);

    mockPostQb.select.mockReturnThis();
    mockPostQb.addSelect.mockReturnThis();
    mockPostQb.orderBy.mockReturnThis();
    mockPostQb.take.mockReturnThis();
    mockPostQb.getMany.mockResolvedValue([]);

    mockTipQb.select.mockReturnThis();
    mockTipQb.addSelect.mockReturnThis();
    mockTipQb.groupBy.mockReturnThis();
    mockTipQb.orderBy.mockReturnThis();
    mockTipQb.limit.mockReturnThis();
    mockTipQb.getRawMany.mockResolvedValue([]);

    mockSubQb.where.mockReturnThis();
    mockSubQb.andWhere.mockReturnThis();
    mockSubQb.getCount.mockResolvedValue(0);
  });

  // =====================================================
  // getDauMau 測試
  // =====================================================
  describe('getDauMau', () => {
    it('快取命中時應直接回傳快取資料', async () => {
      const cachedResult = {
        dau: 150,
        mau: 3000,
        dauMauRatio: 5,
        dailyDau: [{ date: '2024-01-01', count: 150 }],
        calculatedAt: '2024-01-01T12:00:00.000Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.getDauMau(7);

      expect(result).toEqual(cachedResult);
      expect(redis.get).toHaveBeenCalledWith('analytics:dau_mau:7');
      // 不應呼叫 getClient（因為直接使用快取）
      expect(mockScard).not.toHaveBeenCalled();
    });

    it('快取未命中時應計算 DAU/MAU 並寫入快取', async () => {
      redis.get.mockResolvedValue(null);
      // getDauCount 使用 scard 回傳日活躍數
      mockScard
        .mockResolvedValue(100); // 所有日期的 DAU 都回傳 100
      // getMauCount 使用 sunionstore + scard
      mockSunionstore.mockResolvedValue(0);
      mockScard.mockResolvedValue(100);

      const result = await service.getDauMau(3);

      expect(result.dau).toBeDefined();
      expect(result.mau).toBeDefined();
      expect(result.dauMauRatio).toBeDefined();
      expect(result.dailyDau).toBeDefined();
      expect(result.calculatedAt).toBeDefined();

      // 驗證結果寫入快取
      expect(redis.setex).toHaveBeenCalledWith(
        'analytics:dau_mau:3',
        300, // ANALYTICS_CACHE_TTL
        expect.any(String),
      );
    });

    it('MAU 為零時 dauMauRatio 應為 0', async () => {
      redis.get.mockResolvedValue(null);
      mockScard.mockResolvedValue(0);
      mockSunionstore.mockResolvedValue(0);

      const result = await service.getDauMau(1);

      expect(result.dauMauRatio).toBe(0);
    });
  });

  // =====================================================
  // getCreatorRevenueRanking 測試
  // =====================================================
  describe('getCreatorRevenueRanking', () => {
    it('快取命中時應直接回傳快取資料', async () => {
      const cachedRanking = [
        { creatorId: 'u-1', displayName: 'Alice', totalRevenue: 1000, tipCount: 20 },
      ];
      redis.get.mockResolvedValue(JSON.stringify(cachedRanking));

      const result = await service.getCreatorRevenueRanking(10);

      expect(result).toEqual(cachedRanking);
      expect(redis.get).toHaveBeenCalledWith('analytics:creator_revenue:10');
      expect(mockTipQb.getRawMany).not.toHaveBeenCalled();
    });

    it('快取未命中時應查詢 DB 並回傳排行', async () => {
      redis.get.mockResolvedValue(null);
      mockTipQb.getRawMany.mockResolvedValue([
        { creatorId: 'u-1', totalRevenue: '500.50', tipCount: '10' },
        { creatorId: 'u-2', totalRevenue: '300.00', tipCount: '5' },
      ]);
      userRepo.findOne
        .mockResolvedValueOnce({ id: 'u-1', displayName: 'Alice' })
        .mockResolvedValueOnce({ id: 'u-2', displayName: 'Bob' });

      const result = await service.getCreatorRevenueRanking(10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ creatorId: 'u-1', displayName: 'Alice', totalRevenue: 500.5, tipCount: 10 });
      expect(result[1]).toEqual({ creatorId: 'u-2', displayName: 'Bob', totalRevenue: 300, tipCount: 5 });

      // 驗證寫入快取
      expect(redis.setex).toHaveBeenCalledWith(
        'analytics:creator_revenue:10',
        300,
        expect.any(String),
      );
    });

    it('用戶不存在時 displayName 應為「未知用戶」', async () => {
      redis.get.mockResolvedValue(null);
      mockTipQb.getRawMany.mockResolvedValue([
        { creatorId: 'u-deleted', totalRevenue: '100', tipCount: '1' },
      ]);
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.getCreatorRevenueRanking(10);

      expect(result[0].displayName).toBe('未知用戶');
    });
  });

  // =====================================================
  // getPopularContent 測試
  // =====================================================
  describe('getPopularContent', () => {
    it('快取命中時應直接回傳快取資料', async () => {
      const cachedPosts = [
        { postId: 'p-1', creatorId: 'u-1', engagement: 100 },
      ];
      redis.get.mockResolvedValue(JSON.stringify(cachedPosts));

      const result = await service.getPopularContent(10);

      expect(result).toEqual(cachedPosts);
      expect(mockPostQb.getMany).not.toHaveBeenCalled();
    });

    it('快取未命中時應查詢 DB 並回傳熱門內容', async () => {
      redis.get.mockResolvedValue(null);
      mockPostQb.getMany.mockResolvedValue([
        { id: 'p-1', creatorId: 'u-1', contentType: 'image', caption: 'Hello', visibility: 'public', likeCount: 50, commentCount: 30, createdAt: new Date('2024-01-01') },
        { id: 'p-2', creatorId: 'u-2', contentType: 'video', caption: 'World', visibility: 'subscribers', likeCount: 20, commentCount: 10, createdAt: new Date('2024-01-02') },
      ]);

      const result = await service.getPopularContent(10);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        postId: 'p-1',
        creatorId: 'u-1',
        likeCount: 50,
        commentCount: 30,
        engagement: 80,
      });
      expect(result[1].engagement).toBe(30);

      // 驗證寫入快取
      expect(redis.setex).toHaveBeenCalledWith(
        'analytics:popular_content:10',
        300,
        expect.any(String),
      );
    });

    it('無貼文時應回傳空陣列', async () => {
      redis.get.mockResolvedValue(null);
      mockPostQb.getMany.mockResolvedValue([]);

      const result = await service.getPopularContent(10);

      expect(result).toEqual([]);
    });
  });

  // =====================================================
  // getSubscriptionChurnRate 測試
  // =====================================================
  describe('getSubscriptionChurnRate', () => {
    it('快取命中時應直接回傳快取資料', async () => {
      const cachedChurn = {
        period: 'month',
        churnRate: 5.5,
        activeAtStart: 100,
        cancelledDuring: 5,
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedChurn));

      const result = await service.getSubscriptionChurnRate('month');

      expect(result).toEqual(cachedChurn);
      expect(redis.get).toHaveBeenCalledWith('analytics:churn_rate:month');
    });

    it('快取未命中時應計算流失率（month 期間）', async () => {
      redis.get.mockResolvedValue(null);
      mockSubQb.getCount
        .mockResolvedValueOnce(200) // activeAtStart
        .mockResolvedValueOnce(10) // cancelledDuring
        .mockResolvedValueOnce(30); // newDuring
      subscriptionRepo.count.mockResolvedValue(220); // currentActive

      const result = await service.getSubscriptionChurnRate('month');

      expect(result.period).toBe('month');
      expect(result.activeAtStart).toBe(200);
      expect(result.cancelledDuring).toBe(10);
      expect(result.newDuring).toBe(30);
      expect(result.currentActive).toBe(220);
      expect(result.churnRate).toBe(5); // (10/200) * 100 = 5%
      expect(result.periodStart).toBeDefined();
      expect(result.periodEnd).toBeDefined();

      // 驗證寫入快取
      expect(redis.setex).toHaveBeenCalledWith(
        'analytics:churn_rate:month',
        300,
        expect.any(String),
      );
    });

    it('activeAtStart 為零時 churnRate 應為 0', async () => {
      redis.get.mockResolvedValue(null);
      mockSubQb.getCount.mockResolvedValue(0);
      subscriptionRepo.count.mockResolvedValue(0);

      const result = await service.getSubscriptionChurnRate('week');

      expect(result.churnRate).toBe(0);
    });

    it('應支持 week 期間', async () => {
      redis.get.mockResolvedValue(null);
      mockSubQb.getCount.mockResolvedValue(0);
      subscriptionRepo.count.mockResolvedValue(0);

      const result = await service.getSubscriptionChurnRate('week');

      expect(result.period).toBe('week');
      expect(redis.get).toHaveBeenCalledWith('analytics:churn_rate:week');
    });

    it('應支持 quarter 期間', async () => {
      redis.get.mockResolvedValue(null);
      mockSubQb.getCount.mockResolvedValue(0);
      subscriptionRepo.count.mockResolvedValue(0);

      const result = await service.getSubscriptionChurnRate('quarter');

      expect(result.period).toBe('quarter');
    });
  });
});
