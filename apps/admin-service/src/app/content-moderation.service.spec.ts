import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ContentModerationService } from './content-moderation.service';
import { PostEntity, UserEntity } from '@suggar-daddy/database';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { RedisService } from '@suggar-daddy/redis';

describe('ContentModerationService', () => {
  let service: ContentModerationService;
  let redis: jest.Mocked<
    Pick<RedisService, 'set' | 'get' | 'del' | 'getClient'>
  >;
  let kafkaProducer: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;
  let postRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;

  const mockScan = jest.fn();

  const mockUserQb = {
    select: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    redis = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      getClient: jest.fn().mockReturnValue({ scan: mockScan }) as any,
    };

    kafkaProducer = {
      sendEvent: jest.fn().mockResolvedValue(undefined),
    };

    postRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockUserQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentModerationService,
        { provide: getRepositoryToken(PostEntity), useValue: postRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: KafkaProducerService, useValue: kafkaProducer },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<ContentModerationService>(ContentModerationService);
    jest.clearAllMocks();

    // 恢復預設的 mock 行為
    redis.set.mockResolvedValue(undefined);
    redis.get.mockResolvedValue(null);
    redis.del.mockResolvedValue(1);
    redis.getClient.mockReturnValue({ scan: mockScan } as any);
    mockScan.mockResolvedValue(['0', []]);
    kafkaProducer.sendEvent.mockResolvedValue(undefined);
    postRepo.findOne.mockResolvedValue(null);
    postRepo.count.mockResolvedValue(0);
    userRepo.createQueryBuilder.mockReturnValue(mockUserQb);
    mockUserQb.select.mockReturnThis();
    mockUserQb.whereInIds.mockReturnThis();
    mockUserQb.getMany.mockResolvedValue([]);
  });

  // =====================================================
  // listReports 測試
  // =====================================================
  describe('listReports', () => {
    const setupReports = (reports: any[]) => {
      const keys = reports.map((r) => 'report:' + r.id);
      mockScan.mockResolvedValue(['0', keys]);
      // getAllReports 會依序 get 每個 key
      for (const r of reports) {
        redis.get.mockResolvedValueOnce(JSON.stringify(r));
      }
    };

    it('應回傳分頁的檢舉列表', async () => {
      const reports = [
        { id: 'r-1', postId: 'p-1', reporterId: 'u-1', reason: 'spam', status: 'pending', createdAt: '2024-01-02T00:00:00.000Z' },
        { id: 'r-2', postId: 'p-2', reporterId: 'u-2', reason: 'abuse', status: 'resolved', createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      setupReports(reports);

      const result = await service.listReports(1, 10);

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('應依 status 篩選檢舉', async () => {
      const reports = [
        { id: 'r-1', postId: 'p-1', reporterId: 'u-1', reason: 'spam', status: 'pending', createdAt: '2024-01-02T00:00:00.000Z' },
        { id: 'r-2', postId: 'p-2', reporterId: 'u-2', reason: 'abuse', status: 'resolved', createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      setupReports(reports);

      const result = await service.listReports(1, 10, 'pending');

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('pending');
    });

    it('無檢舉時應回傳空列表', async () => {
      mockScan.mockResolvedValue(['0', []]);

      const result = await service.listReports(1, 10);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });
  });

  // =====================================================
  // getReportDetail 測試
  // =====================================================
  describe('getReportDetail', () => {
    it('應回傳檢舉詳情及關聯的費文', async () => {
      const report = { id: 'r-1', postId: 'p-1', reporterId: 'u-1', reason: 'spam', status: 'pending', createdAt: '2024-01-01T00:00:00.000Z' };
      redis.get.mockResolvedValue(JSON.stringify(report));
      const mockPost = { id: 'p-1', creatorId: 'u-2', caption: 'test' };
      postRepo.findOne.mockResolvedValue(mockPost);

      const result = await service.getReportDetail('r-1');

      expect(result).toMatchObject({ id: 'r-1', postId: 'p-1', post: mockPost });
      expect(redis.get).toHaveBeenCalledWith('report:r-1');
    });

    it('費文不存在時 post 應為 null', async () => {
      const report = { id: 'r-2', postId: 'p-deleted', reporterId: 'u-1', reason: 'spam', status: 'pending', createdAt: '2024-01-01T00:00:00.000Z' };
      redis.get.mockResolvedValue(JSON.stringify(report));
      postRepo.findOne.mockResolvedValue(null);

      const result = await service.getReportDetail('r-2');

      expect(result.post).toBeNull();
    });

    it('檢舉不存在時應拋出 NotFoundException', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.getReportDetail('r-nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getReportDetail('r-nonexistent')).rejects.toThrow('檢舉紀錄 r-nonexistent 不存在');
    });
  });

  // =====================================================
  // takeDownPost 測試
  // =====================================================
  describe('takeDownPost', () => {
    it('應下架費文、標記 Redis、發送 Kafka 事件', async () => {
      const mockPost = { id: 'p-1', creatorId: 'u-creator-1' };
      postRepo.findOne.mockResolvedValue(mockPost);
      // resolveReportsForPost 會呼叫 getAllReports（scan 回傳空）
      mockScan.mockResolvedValue(['0', []]);

      const result = await service.takeDownPost('p-1', '違規內容');

      expect(result).toEqual({ success: true, message: '費文 p-1 已下架' });

      // 驗證 Redis 標記
      expect(redis.set).toHaveBeenCalledWith(
        'post:taken_down:p-1',
        expect.any(String),
      );

      // 驗證 Kafka 事件
      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        'content.post.taken_down',
        expect.objectContaining({
          postId: 'p-1',
          creatorId: 'u-creator-1',
          reason: '違規內容',
        }),
      );
    });

    it('費文不存在時應拋出 NotFoundException', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.takeDownPost('p-nonexistent', '理由')).rejects.toThrow(NotFoundException);
    });

    it('下架後應將關聯的 pending 檢舉標記為 resolved', async () => {
      const mockPost = { id: 'p-1', creatorId: 'u-creator-1' };
      postRepo.findOne.mockResolvedValue(mockPost);

      // 第一次 scan（takeDownPost 中的 resolveReportsForPost → getAllReports）
      const pendingReport = { id: 'r-1', postId: 'p-1', reporterId: 'u-1', reason: 'spam', status: 'pending', createdAt: '2024-01-01T00:00:00.000Z' };
      mockScan.mockResolvedValue(['0', ['report:r-1']]);
      redis.get.mockResolvedValueOnce(JSON.stringify(pendingReport));

      await service.takeDownPost('p-1', '違規');

      // 驗證檢舉被標記為 resolved
      expect(redis.set).toHaveBeenCalledWith(
        'report:r-1',
        expect.stringContaining('"status":"resolved"'),
      );
    });
  });

  // =====================================================
  // reinstatePost 測試
  // =====================================================
  describe('reinstatePost', () => {
    it('應恢復費文、移除 Redis 標記、發送 Kafka 事件', async () => {
      const mockPost = { id: 'p-1', creatorId: 'u-creator-1' };
      postRepo.findOne.mockResolvedValue(mockPost);

      const result = await service.reinstatePost('p-1');

      expect(result).toEqual({ success: true, message: '費文 p-1 已恢復' });
      expect(redis.del).toHaveBeenCalledWith('post:taken_down:p-1');
      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        'content.post.reinstated',
        expect.objectContaining({
          postId: 'p-1',
          creatorId: 'u-creator-1',
        }),
      );
    });

    it('費文不存在時應拋出 NotFoundException', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.reinstatePost('p-nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // =====================================================
  // getContentStats 測試
  // =====================================================
  describe('getContentStats', () => {
    it('應回傳內容統計資料', async () => {
      postRepo.count.mockResolvedValue(50);

      // getAllReports scan
      const reports = [
        { id: 'r-1', postId: 'p-1', reporterId: 'u-1', reason: 'spam', status: 'pending', createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'r-2', postId: 'p-2', reporterId: 'u-2', reason: 'abuse', status: 'resolved', createdAt: '2024-01-02T00:00:00.000Z' },
        { id: 'r-3', postId: 'p-3', reporterId: 'u-3', reason: 'other', status: 'pending', createdAt: '2024-01-03T00:00:00.000Z' },
      ];
      // 第一次 scan（getAllReports）
      mockScan
        .mockResolvedValueOnce(['0', ['report:r-1', 'report:r-2', 'report:r-3']])
        // 第二次 scan（countTakenDownPosts）
        .mockResolvedValueOnce(['0', ['post:taken_down:p-10', 'post:taken_down:p-11']]);

      redis.get
        .mockResolvedValueOnce(JSON.stringify(reports[0]))
        .mockResolvedValueOnce(JSON.stringify(reports[1]))
        .mockResolvedValueOnce(JSON.stringify(reports[2]));

      const result = await service.getContentStats();

      expect(result.totalPosts).toBe(50);
      expect(result.pendingReports).toBe(2);
      expect(result.resolvedReports).toBe(1);
      expect(result.takenDownCount).toBe(2);
    });

    it('無資料時應回傳零值', async () => {
      postRepo.count.mockResolvedValue(0);
      mockScan.mockResolvedValue(['0', []]);

      const result = await service.getContentStats();

      expect(result.totalPosts).toBe(0);
      expect(result.pendingReports).toBe(0);
      expect(result.resolvedReports).toBe(0);
      expect(result.takenDownCount).toBe(0);
    });
  });
});
