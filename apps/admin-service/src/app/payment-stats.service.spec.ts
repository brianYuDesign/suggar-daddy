import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentStatsService } from './payment-stats.service';
import {
  TransactionEntity,
  TipEntity,
  SubscriptionEntity,
} from '@suggar-daddy/database';

describe('PaymentStatsService', () => {
  let service: PaymentStatsService;
  let transactionRepo: Record<string, jest.Mock>;
  let tipRepo: Record<string, jest.Mock>;
  let subscriptionRepo: Record<string, jest.Mock>;

  const mockTxQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
  };

  const mockTipQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockSubQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    transactionRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(mockTxQb),
      count: jest.fn().mockResolvedValue(0),
    };

    tipRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTipQb),
    };

    subscriptionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockSubQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentStatsService,
        { provide: getRepositoryToken(TransactionEntity), useValue: transactionRepo },
        { provide: getRepositoryToken(TipEntity), useValue: tipRepo },
        { provide: getRepositoryToken(SubscriptionEntity), useValue: subscriptionRepo },
      ],
    }).compile();

    service = module.get<PaymentStatsService>(PaymentStatsService);
    jest.clearAllMocks();

    // 恢復預設的 mock 行為
    transactionRepo.find.mockResolvedValue([]);
    transactionRepo.createQueryBuilder.mockReturnValue(mockTxQb);
    transactionRepo.count.mockResolvedValue(0);
    tipRepo.createQueryBuilder.mockReturnValue(mockTipQb);
    subscriptionRepo.createQueryBuilder.mockReturnValue(mockSubQb);

    mockTxQb.select.mockReturnThis();
    mockTxQb.addSelect.mockReturnThis();
    mockTxQb.where.mockReturnThis();
    mockTxQb.andWhere.mockReturnThis();
    mockTxQb.groupBy.mockReturnThis();
    mockTxQb.orderBy.mockReturnThis();
    mockTxQb.getRawMany.mockResolvedValue([]);
    mockTxQb.getRawOne.mockResolvedValue(null);

    mockTipQb.select.mockReturnThis();
    mockTipQb.addSelect.mockReturnThis();
    mockTipQb.groupBy.mockReturnThis();
    mockTipQb.getRawMany.mockResolvedValue([]);

    mockSubQb.select.mockReturnThis();
    mockSubQb.addSelect.mockReturnThis();
    mockSubQb.where.mockReturnThis();
    mockSubQb.groupBy.mockReturnThis();
    mockSubQb.getRawMany.mockResolvedValue([]);
  });

  // =====================================================
  // getRevenueReport 測試
  // =====================================================
  describe('getRevenueReport', () => {
    it('應回傳營收報表（依類型分組）', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: '100.50', type: 'tip', status: 'completed', createdAt: new Date('2024-01-15') },
        { id: 'tx-2', amount: '200.00', type: 'subscription', status: 'completed', createdAt: new Date('2024-01-16') },
        { id: 'tx-3', amount: '50.25', type: 'tip', status: 'completed', createdAt: new Date('2024-01-17') },
      ];
      transactionRepo.find.mockResolvedValue(mockTransactions);

      const result = await service.getRevenueReport('2024-01-01', '2024-01-31');

      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-01-31');
      expect(result.totalRevenue).toBe(350.75);
      expect(result.transactionCount).toBe(3);
      expect(result.byType).toEqual({
        tip: { count: 2, amount: 150.75 },
        subscription: { count: 1, amount: 200.00 },
      });
    });

    it('無交易時應回傳零值', async () => {
      transactionRepo.find.mockResolvedValue([]);

      const result = await service.getRevenueReport('2024-01-01', '2024-01-31');

      expect(result.totalRevenue).toBe(0);
      expect(result.transactionCount).toBe(0);
      expect(result.byType).toEqual({});
    });

    it('應正確四捨五入營收金額', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: '33.333', type: 'tip', status: 'completed', createdAt: new Date() },
        { id: 'tx-2', amount: '66.667', type: 'tip', status: 'completed', createdAt: new Date() },
      ];
      transactionRepo.find.mockResolvedValue(mockTransactions);

      const result = await service.getRevenueReport('2024-01-01', '2024-12-31');

      expect(result.totalRevenue).toBe(100);
    });
  });

  // =====================================================
  // getTopCreators 測試
  // =====================================================
  describe('getTopCreators', () => {
    it('應回傳依營收排序的創作者排行', async () => {
      mockTipQb.getRawMany.mockResolvedValue([
        { creatorId: 'u-1', tipRevenue: '500', tipCount: '10' },
        { creatorId: 'u-2', tipRevenue: '300', tipCount: '5' },
      ]);
      mockSubQb.getRawMany.mockResolvedValue([
        { creatorId: 'u-1', subscriberCount: '100' },
        { creatorId: 'u-3', subscriberCount: '50' },
      ]);

      const result = await service.getTopCreators(10);

      expect(result).toHaveLength(3);
      // 依 tipRevenue 降序
      expect(result[0].creatorId).toBe('u-1');
      expect(result[0].tipRevenue).toBe(500);
      expect(result[0].subscriberCount).toBe(100);
      expect(result[1].creatorId).toBe('u-2');
      expect(result[1].tipRevenue).toBe(300);
      expect(result[1].subscriberCount).toBe(0);
      expect(result[2].creatorId).toBe('u-3');
      expect(result[2].tipRevenue).toBe(0);
      expect(result[2].subscriberCount).toBe(50);
    });

    it('應依 limit 截斷結果', async () => {
      mockTipQb.getRawMany.mockResolvedValue([
        { creatorId: 'u-1', tipRevenue: '500', tipCount: '10' },
        { creatorId: 'u-2', tipRevenue: '300', tipCount: '5' },
        { creatorId: 'u-3', tipRevenue: '100', tipCount: '2' },
      ]);
      mockSubQb.getRawMany.mockResolvedValue([]);

      const result = await service.getTopCreators(2);

      expect(result).toHaveLength(2);
      expect(result[0].creatorId).toBe('u-1');
      expect(result[1].creatorId).toBe('u-2');
    });

    it('無資料時應回傳空陣列', async () => {
      mockTipQb.getRawMany.mockResolvedValue([]);
      mockSubQb.getRawMany.mockResolvedValue([]);

      const result = await service.getTopCreators(10);

      expect(result).toEqual([]);
    });
  });

  // =====================================================
  // getDailyRevenue 測試
  // =====================================================
  describe('getDailyRevenue', () => {
    it('應回傳每日營收資料', async () => {
      mockTxQb.getRawMany.mockResolvedValue([
        { date: '2024-01-15', revenue: '250.50', count: '5' },
        { date: '2024-01-16', revenue: '180.00', count: '3' },
      ]);

      const result = await service.getDailyRevenue(7);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: '2024-01-15', revenue: 250.5, count: 5 });
      expect(result[1]).toEqual({ date: '2024-01-16', revenue: 180, count: 3 });
    });

    it('無交易時應回傳空陣列', async () => {
      mockTxQb.getRawMany.mockResolvedValue([]);

      const result = await service.getDailyRevenue(30);

      expect(result).toEqual([]);
    });
  });

  // =====================================================
  // getPaymentStats 測試
  // =====================================================
  describe('getPaymentStats', () => {
    it('應回傳支付概覽統計', async () => {
      transactionRepo.count
        .mockResolvedValueOnce(200) // totalTransactions
        .mockResolvedValueOnce(180); // successfulTransactions

      mockTxQb.getRawOne
        .mockResolvedValueOnce({ total: '50000.99' }) // totalAmount
        .mockResolvedValueOnce({ avg: '277.78' }); // averageAmount

      const result = await service.getPaymentStats();

      expect(result.totalTransactions).toBe(200);
      expect(result.successfulTransactions).toBe(180);
      expect(result.totalAmount).toBe(50000.99);
      expect(result.averageAmount).toBe(277.78);
      expect(result.successRate).toBe(90); // (180/200) * 100
    });

    it('無交易時應回傳零值', async () => {
      transactionRepo.count.mockResolvedValue(0);
      mockTxQb.getRawOne.mockResolvedValue(null);

      const result = await service.getPaymentStats();

      expect(result.totalTransactions).toBe(0);
      expect(result.successfulTransactions).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.averageAmount).toBe(0);
      expect(result.successRate).toBe(0);
    });

    it('應正確計算成功率百分比', async () => {
      transactionRepo.count
        .mockResolvedValueOnce(3) // totalTransactions
        .mockResolvedValueOnce(1); // successfulTransactions

      mockTxQb.getRawOne
        .mockResolvedValueOnce({ total: '100' })
        .mockResolvedValueOnce({ avg: '100' });

      const result = await service.getPaymentStats();

      expect(result.successRate).toBe(33.33); // (1/3) * 100 = 33.33%
    });
  });
});
