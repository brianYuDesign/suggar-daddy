import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { WithdrawalManagementService } from './withdrawal-management.service';
import { RedisService } from '@suggar-daddy/redis';
import { UserEntity } from '@suggar-daddy/database';

describe('WithdrawalManagementService', () => {
  let service: WithdrawalManagementService;
  let redis: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;

  const mockWithdrawal = (overrides = {}) => ({
    id: 'wd-1',
    userId: 'user-1',
    amount: 100,
    status: 'pending',
    payoutMethod: 'bank_transfer',
    requestedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  });

  const mockWallet = (overrides = {}) => ({
    balance: 500,
    totalEarnings: 1000,
    totalWithdrawn: 500,
    updatedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  });

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      lRange: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
    };
    userRepo = {
      findBy: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalManagementService,
        { provide: RedisService, useValue: redis },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:3007') } },
      ],
    }).compile();

    service = module.get(WithdrawalManagementService);
    jest.clearAllMocks();
  });

  describe('listWithdrawals', () => {
    it('應回傳分頁提款列表', async () => {
      redis.lRange.mockResolvedValue([]);

      const result = await service.listWithdrawals(1, 10);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });

    it('應回傳帶使用者資訊的提款', async () => {
      const wd = mockWithdrawal();
      redis.lRange.mockResolvedValue(['wd-1']);
      redis.mget.mockResolvedValue([JSON.stringify(wd)]);
      userRepo.findBy.mockResolvedValue([
        { id: 'user-1', displayName: 'User', email: 'u@test.com', avatarUrl: null },
      ]);

      const result = await service.listWithdrawals(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].user).toEqual(expect.objectContaining({ id: 'user-1' }));
    });

    it('應支援狀態篩選', async () => {
      const pending = mockWithdrawal({ id: 'wd-1', status: 'pending' });
      const completed = mockWithdrawal({ id: 'wd-2', status: 'completed' });
      redis.lRange.mockResolvedValue(['wd-1', 'wd-2']);
      redis.mget.mockResolvedValue([JSON.stringify(pending), JSON.stringify(completed)]);

      const result = await service.listWithdrawals(1, 10, 'pending');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('wd-1');
    });

    it('應支援分頁', async () => {
      const withdrawals = Array.from({ length: 5 }, (_, i) =>
        mockWithdrawal({
          id: `wd-${i}`,
          requestedAt: new Date(Date.now() - i * 86400000).toISOString(),
        }),
      );
      redis.lRange.mockResolvedValue(withdrawals.map((w) => w.id));
      redis.mget.mockResolvedValue(withdrawals.map((w) => JSON.stringify(w)));

      const result = await service.listWithdrawals(2, 2);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
    });
  });

  describe('getWithdrawalStats', () => {
    it('應回傳提款統計', async () => {
      const withdrawals = [
        mockWithdrawal({ id: 'wd-1', status: 'pending', amount: 100 }),
        mockWithdrawal({ id: 'wd-2', status: 'completed', amount: 200 }),
        mockWithdrawal({ id: 'wd-3', status: 'rejected', amount: 50 }),
      ];
      redis.lRange.mockResolvedValue(withdrawals.map((w) => w.id));
      redis.mget.mockResolvedValue(withdrawals.map((w) => JSON.stringify(w)));

      const result = await service.getWithdrawalStats();

      expect(result.pendingCount).toBe(1);
      expect(result.pendingAmount).toBe(100);
      expect(result.completedCount).toBe(1);
      expect(result.completedAmount).toBe(200);
      expect(result.rejectedCount).toBe(1);
      expect(result.totalCount).toBe(3);
    });

    it('無提款時應回傳零值', async () => {
      redis.lRange.mockResolvedValue([]);
      redis.mget.mockResolvedValue([]);

      const result = await service.getWithdrawalStats();

      expect(result.pendingCount).toBe(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getWithdrawalDetail', () => {
    it('應回傳提款詳情含使用者和錢包', async () => {
      const wd = mockWithdrawal();
      redis.get
        .mockResolvedValueOnce(JSON.stringify(wd))
        .mockResolvedValueOnce(JSON.stringify(mockWallet()));
      userRepo.findOneBy.mockResolvedValue({
        id: 'user-1', displayName: 'User', email: 'u@test.com', avatarUrl: null, role: 'CREATOR',
      });

      const result = await service.getWithdrawalDetail('wd-1');

      expect(result.id).toBe('wd-1');
      expect(result.user).toEqual(expect.objectContaining({ id: 'user-1' }));
      expect(result.wallet).toEqual(expect.objectContaining({ balance: 500 }));
    });

    it('找不到提款時應拋出 NotFoundException', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.getWithdrawalDetail('wd-missing'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('processWithdrawal', () => {
    it('應成功批准提款', async () => {
      const wd = mockWithdrawal({ status: 'pending' });
      redis.get
        .mockResolvedValueOnce(JSON.stringify(wd))
        .mockResolvedValueOnce(JSON.stringify(mockWallet()));

      const result = await service.processWithdrawal('wd-1', 'approve');

      expect(result.success).toBe(true);
      expect(result.withdrawal.status).toBe('completed');
      expect(redis.set).toHaveBeenCalled();
    });

    it('應成功拒絕提款並退還餘額', async () => {
      const wd = mockWithdrawal({ status: 'pending', amount: 100 });
      const wallet = mockWallet({ balance: 400 });
      redis.get
        .mockResolvedValueOnce(JSON.stringify(wd))
        .mockResolvedValueOnce(JSON.stringify(wallet));

      const result = await service.processWithdrawal('wd-1', 'reject', 'Invalid');

      expect(result.success).toBe(true);
      expect(result.withdrawal.status).toBe('rejected');
    });

    it('非 pending 狀態不應處理', async () => {
      const wd = mockWithdrawal({ status: 'completed' });
      redis.get.mockResolvedValue(JSON.stringify(wd));

      const result = await service.processWithdrawal('wd-1', 'approve');

      expect(result.success).toBe(false);
      expect(result.message).toContain('already completed');
    });

    it('找不到提款時應拋出 NotFoundException', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.processWithdrawal('wd-missing', 'approve'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
