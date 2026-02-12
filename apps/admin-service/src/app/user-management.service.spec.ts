import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import {
  UserEntity,
  PostEntity,
  SubscriptionEntity,
  TransactionEntity,
} from '@suggar-daddy/database';
import { RedisService } from '@suggar-daddy/redis';

describe('UserManagementService', () => {
  let service: UserManagementService;
  let redis: jest.Mocked<
    Pick<RedisService, 'set' | 'get' | 'del' | 'getClient'>
  >;
  let userRepo: Record<string, jest.Mock>;
  let postRepo: Record<string, jest.Mock>;
  let subscriptionRepo: Record<string, jest.Mock>;
  let transactionRepo: Record<string, jest.Mock>;

  const mockScan = jest.fn();

  const mockQb = {
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockPostQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockSubQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
  };

  const mockTxQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    redis = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      getClient: jest.fn().mockReturnValue({ scan: mockScan }) as any,
    };

    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    postRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockPostQb),
      count: jest.fn().mockResolvedValue(0),
    };

    subscriptionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockSubQb),
    };

    transactionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTxQb),
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserManagementService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(PostEntity), useValue: postRepo },
        { provide: getRepositoryToken(SubscriptionEntity), useValue: subscriptionRepo },
        { provide: getRepositoryToken(TransactionEntity), useValue: transactionRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<UserManagementService>(UserManagementService);
    jest.clearAllMocks();

    // 恢復預設的 mock 行為
    redis.set.mockResolvedValue(undefined);
    redis.get.mockResolvedValue(null);
    redis.del.mockResolvedValue(1);
    redis.getClient.mockReturnValue({ scan: mockScan } as any);
    mockScan.mockResolvedValue(['0', []]);

    userRepo.createQueryBuilder.mockReturnValue(mockQb);
    userRepo.findOne.mockResolvedValue(null);
    userRepo.count.mockResolvedValue(0);
    userRepo.save.mockImplementation((u) => Promise.resolve(u));

    postRepo.createQueryBuilder.mockReturnValue(mockPostQb);
    postRepo.count.mockResolvedValue(0);
    mockPostQb.where.mockReturnThis();
    mockPostQb.orderBy.mockReturnThis();
    mockPostQb.take.mockReturnThis();
    mockPostQb.getMany.mockResolvedValue([]);

    subscriptionRepo.createQueryBuilder.mockReturnValue(mockSubQb);
    mockSubQb.where.mockReturnThis();
    mockSubQb.orderBy.mockReturnThis();
    mockSubQb.take.mockReturnThis();
    mockSubQb.getMany.mockResolvedValue([]);
    mockSubQb.getCount.mockResolvedValue(0);

    transactionRepo.createQueryBuilder.mockReturnValue(mockTxQb);
    transactionRepo.count.mockResolvedValue(0);
    mockTxQb.where.mockReturnThis();
    mockTxQb.orderBy.mockReturnThis();
    mockTxQb.take.mockReturnThis();
    mockTxQb.getMany.mockResolvedValue([]);

    mockQb.andWhere.mockReturnThis();
    mockQb.where.mockReturnThis();
    mockQb.orderBy.mockReturnThis();
    mockQb.skip.mockReturnThis();
    mockQb.take.mockReturnThis();
    mockQb.select.mockReturnThis();
    mockQb.addSelect.mockReturnThis();
    mockQb.groupBy.mockReturnThis();
    mockQb.whereInIds.mockReturnThis();
    mockQb.getManyAndCount.mockResolvedValue([[], 0]);
    mockQb.getMany.mockResolvedValue([]);
    mockQb.getCount.mockResolvedValue(0);
    mockQb.getRawMany.mockResolvedValue([]);
  });

  // =====================================================
  // listUsers 測試
  // =====================================================
  describe('listUsers', () => {
    it('應回傳分頁用戶列表並移除 passwordHash', async () => {
      const mockUsers = [
        { id: 'u-1', email: 'a@b.com', displayName: 'UserA', role: 'subscriber', passwordHash: 'secret', createdAt: new Date() },
        { id: 'u-2', email: 'c@d.com', displayName: 'UserB', role: 'creator', passwordHash: 'secret2', createdAt: new Date() },
      ];
      mockQb.getManyAndCount.mockResolvedValue([mockUsers, 2]);

      const result = await service.listUsers(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      // 驗證 passwordHash 已被移除
      expect(result.data[0]).not.toHaveProperty('passwordHash');
      expect(result.data[1]).not.toHaveProperty('passwordHash');
      expect(result.data[0]).toMatchObject({ id: 'u-1', email: 'a@b.com' });
    });

    it('應依 role 篩選', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(1, 10, 'creator');

      expect(mockQb.andWhere).toHaveBeenCalledWith('user.role = :role', { role: 'creator' });
    });

    it('依 status=disabled 篩選，有停用用戶時應查詢指定 ID', async () => {
      mockScan.mockResolvedValue(['0', ['user:disabled:u-1', 'user:disabled:u-2']]);
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(1, 10, undefined, 'disabled');

      expect(mockQb.andWhere).toHaveBeenCalledWith('user.id IN (:...ids)', { ids: ['u-1', 'u-2'] });
    });

    it('依 status=disabled 篩選，無停用用戶時應回傳空列表', async () => {
      mockScan.mockResolvedValue(['0', []]);

      const result = await service.listUsers(1, 10, undefined, 'disabled');

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });

    it('應正確計算分頁 skip 與 take', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listUsers(3, 20);

      expect(mockQb.skip).toHaveBeenCalledWith(40); // (3 - 1) * 20
      expect(mockQb.take).toHaveBeenCalledWith(20);
    });
  });

  // =====================================================
  // getUserDetail 測試
  // =====================================================
  describe('getUserDetail', () => {
    it('應回傳用戶詳情（包含 isDisabled 狀態）', async () => {
      const mockUser = { id: 'u-1', email: 'a@b.com', displayName: 'UserA', role: 'subscriber', passwordHash: 'hash' };
      userRepo.findOne.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue('true');

      const result = await service.getUserDetail('u-1');

      expect(result).toMatchObject({ id: 'u-1', email: 'a@b.com', isDisabled: true });
      expect(result).not.toHaveProperty('passwordHash');
      expect(redis.get).toHaveBeenCalledWith('user:disabled:u-1');
    });

    it('用戶未停用時 isDisabled 應為 false', async () => {
      const mockUser = { id: 'u-2', email: 'c@d.com', displayName: 'UserB', role: 'creator', passwordHash: 'hash' };
      userRepo.findOne.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue(null);

      const result = await service.getUserDetail('u-2');

      expect(result.isDisabled).toBe(false);
    });

    it('用戶不存在時應拋出 NotFoundException', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserDetail('u-nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getUserDetail('u-nonexistent')).rejects.toThrow('用戶 u-nonexistent 不存在');
    });
  });

  // =====================================================
  // disableUser 測試
  // =====================================================
  describe('disableUser', () => {
    it('應在 Redis 標記用戶為停用並回傳成功', async () => {
      const mockUser = { id: 'u-1', email: 'a@b.com', passwordHash: 'hash' };
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.disableUser('u-1');

      expect(result).toEqual({ success: true, message: '用戶 u-1 已停用' });
      expect(redis.set).toHaveBeenCalledWith('user:disabled:u-1', 'true');
    });

    it('用戶不存在時應拋出 NotFoundException', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.disableUser('u-nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // =====================================================
  // enableUser 測試
  // =====================================================
  describe('enableUser', () => {
    it('應從 Redis 移除停用標記並回傳成功', async () => {
      const mockUser = { id: 'u-1', email: 'a@b.com', passwordHash: 'hash' };
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.enableUser('u-1');

      expect(result).toEqual({ success: true, message: '用戶 u-1 已重新啟用' });
      expect(redis.del).toHaveBeenCalledWith('user:disabled:u-1');
    });

    it('用戶不存在時應拋出 NotFoundException', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.enableUser('u-nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // =====================================================
  // getUserStats 測試
  // =====================================================
  describe('getUserStats', () => {
    it('應回傳用戶統計資料（總數、角色分布、新增用戶）', async () => {
      userRepo.count.mockResolvedValue(100);
      mockQb.getRawMany.mockResolvedValue([
        { role: 'subscriber', count: '70' },
        { role: 'creator', count: '25' },
        { role: 'admin', count: '5' },
      ]);
      mockQb.getCount
        .mockResolvedValueOnce(15) // newUsersThisWeek
        .mockResolvedValueOnce(45); // newUsersThisMonth

      const result = await service.getUserStats();

      expect(result.totalUsers).toBe(100);
      expect(result.byRole).toEqual({ subscriber: 70, creator: 25, admin: 5 });
      expect(result.newUsersThisWeek).toBe(15);
      expect(result.newUsersThisMonth).toBe(45);
    });

    it('無用戶時應回傳零值統計', async () => {
      userRepo.count.mockResolvedValue(0);
      mockQb.getRawMany.mockResolvedValue([]);
      mockQb.getCount.mockResolvedValue(0);

      const result = await service.getUserStats();

      expect(result.totalUsers).toBe(0);
      expect(result.byRole).toEqual({});
      expect(result.newUsersThisWeek).toBe(0);
      expect(result.newUsersThisMonth).toBe(0);
    });
  });
});
