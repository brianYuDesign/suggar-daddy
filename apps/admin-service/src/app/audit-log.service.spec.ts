import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLogEntity } from '@suggar-daddy/database';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repo: Record<string, jest.Mock>;

  const mockQb = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((data) => ({ id: 'log-1', ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, createdAt: new Date() })),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLogEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    jest.clearAllMocks();

    // 恢復預設 mock
    repo.create.mockImplementation((data) => ({ id: 'log-1', ...data }));
    repo.save.mockImplementation((entity) => Promise.resolve({ ...entity, createdAt: new Date() }));
    repo.findOne.mockResolvedValue(null);
    repo.createQueryBuilder.mockReturnValue(mockQb);
    mockQb.andWhere.mockReturnThis();
    mockQb.orderBy.mockReturnThis();
    mockQb.skip.mockReturnThis();
    mockQb.take.mockReturnThis();
    mockQb.getManyAndCount.mockResolvedValue([[], 0]);
  });

  // =====================================================
  // createLog 測試
  // =====================================================
  describe('createLog', () => {
    it('應建立並儲存審計日誌', async () => {
      const logData = {
        action: 'post.users.disable',
        adminId: 'admin-1',
        targetType: 'users',
        targetId: 'u-1',
        details: '{}',
        method: 'POST',
        path: '/api/admin/users/u-1/disable',
        statusCode: 200,
      };

      const result = await service.createLog(logData);

      expect(repo.create).toHaveBeenCalledWith({
        action: logData.action,
        adminId: logData.adminId,
        targetType: logData.targetType,
        targetId: logData.targetId,
        details: logData.details,
        method: logData.method,
        path: logData.path,
        statusCode: logData.statusCode,
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ action: logData.action, adminId: logData.adminId });
    });

    it('可選欄位為空時應設為 null', async () => {
      const logData = {
        action: 'post.dlq.retry-all',
        adminId: 'admin-1',
        method: 'POST',
        path: '/api/admin/dlq/retry-all',
      };

      await service.createLog(logData);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: null,
          targetId: null,
          details: null,
          statusCode: null,
        }),
      );
    });
  });

  // =====================================================
  // listLogs 測試
  // =====================================================
  describe('listLogs', () => {
    it('應回傳分頁的審計日誌', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'post.users.disable', adminId: 'admin-1', createdAt: new Date() },
      ];
      mockQb.getManyAndCount.mockResolvedValue([mockLogs, 1]);

      const result = await service.listLogs(1, 20);

      expect(result).toEqual({ data: mockLogs, total: 1, page: 1, limit: 20 });
      expect(mockQb.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC');
      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(20);
    });

    it('應依 action 篩選', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listLogs(1, 20, 'post.users.disable');

      expect(mockQb.andWhere).toHaveBeenCalledWith('log.action = :action', { action: 'post.users.disable' });
    });

    it('應依 adminId 篩選', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listLogs(1, 20, undefined, 'admin-1');

      expect(mockQb.andWhere).toHaveBeenCalledWith('log.adminId = :adminId', { adminId: 'admin-1' });
    });

    it('應依 targetType 篩選', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listLogs(1, 20, undefined, undefined, 'users');

      expect(mockQb.andWhere).toHaveBeenCalledWith('log.targetType = :targetType', { targetType: 'users' });
    });

    it('應正確計算分頁 skip', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listLogs(3, 10);

      expect(mockQb.skip).toHaveBeenCalledWith(20); // (3 - 1) * 10
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });
  });

  // =====================================================
  // getLog 測試
  // =====================================================
  describe('getLog', () => {
    it('應回傳指定的審計日誌', async () => {
      const mockLog = { id: 'log-1', action: 'post.users.disable', adminId: 'admin-1' };
      repo.findOne.mockResolvedValue(mockLog);

      const result = await service.getLog('log-1');

      expect(result).toEqual(mockLog);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'log-1' } });
    });

    it('日誌不存在時應回傳 null', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.getLog('log-nonexistent');

      expect(result).toBeNull();
    });
  });
});
