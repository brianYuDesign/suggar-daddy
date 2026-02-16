import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionManagementService } from './transaction-management.service';
import { TransactionEntity, UserEntity } from '@suggar-daddy/database';
import { StripeService } from '@suggar-daddy/common';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('TransactionManagementService', () => {
  let service: TransactionManagementService;
  let transactionRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;

  const mockTxQb = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockUserQb = {
    select: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    transactionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTxQb),
    };
    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockUserQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionManagementService,
        { provide: getRepositoryToken(TransactionEntity), useValue: transactionRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: StripeService, useValue: { refund: jest.fn() } },
        { provide: KafkaProducerService, useValue: { sendEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(TransactionManagementService);

    jest.clearAllMocks();
    mockTxQb.andWhere.mockReturnThis();
    mockTxQb.orderBy.mockReturnThis();
    mockTxQb.skip.mockReturnThis();
    mockTxQb.take.mockReturnThis();
    mockTxQb.getManyAndCount.mockResolvedValue([[], 0]);
    mockTxQb.select.mockReturnThis();
    mockTxQb.addSelect.mockReturnThis();
    mockTxQb.where.mockReturnThis();
    mockTxQb.groupBy.mockReturnThis();
    mockTxQb.getRawMany.mockResolvedValue([]);
    mockUserQb.select.mockReturnThis();
    mockUserQb.whereInIds.mockReturnThis();
    mockUserQb.getMany.mockResolvedValue([]);
  });

  describe('listTransactions', () => {
    it('應回傳分頁交易列表', async () => {
      mockTxQb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.listTransactions(1, 10);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });

    it('應支援 type 篩選', async () => {
      mockTxQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listTransactions(1, 10, 'tip');

      expect(mockTxQb.andWhere).toHaveBeenCalledWith('tx.type = :type', { type: 'tip' });
    });

    it('應支援 status 篩選', async () => {
      mockTxQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listTransactions(1, 10, undefined, 'succeeded');

      expect(mockTxQb.andWhere).toHaveBeenCalledWith('tx.status = :status', { status: 'succeeded' });
    });

    it('應附帶使用者資訊', async () => {
      const tx = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'tip',
        amount: 100,
        status: 'succeeded',
        stripePaymentId: 'pi_123',
        relatedEntityId: 'creator-1',
        relatedEntityType: 'creator',
        createdAt: new Date(),
      };
      mockTxQb.getManyAndCount.mockResolvedValue([[tx], 1]);
      mockUserQb.getMany.mockResolvedValue([
        { id: 'user-1', email: 'u@test.com', displayName: 'User', avatarUrl: null },
      ]);

      const result = await service.listTransactions(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].user).toEqual(expect.objectContaining({ id: 'user-1' }));
      expect(result.data[0].amount).toBe(100);
    });
  });

  describe('getTransactionTypeStats', () => {
    it('應回傳交易類型和狀態統計', async () => {
      mockTxQb.getRawMany
        .mockResolvedValueOnce([
          { type: 'tip', count: '50', totalAmount: '2500.50' },
          { type: 'subscription', count: '30', totalAmount: '1500.00' },
        ])
        .mockResolvedValueOnce([
          { status: 'succeeded', count: '70' },
          { status: 'failed', count: '10' },
        ]);

      const result = await service.getTransactionTypeStats();

      expect(result.byType).toHaveLength(2);
      expect(result.byType[0]).toEqual({ type: 'tip', count: 50, totalAmount: 2500.5 });
      expect(result.byType[1]).toEqual({ type: 'subscription', count: 30, totalAmount: 1500 });
      expect(result.byStatus).toHaveLength(2);
      expect(result.byStatus[0]).toEqual({ status: 'succeeded', count: 70 });
    });

    it('無交易時應回傳空陣列', async () => {
      mockTxQb.getRawMany.mockResolvedValue([]);

      const result = await service.getTransactionTypeStats();

      expect(result.byType).toEqual([]);
      expect(result.byStatus).toEqual([]);
    });
  });
});
