import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportService } from './report.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('ReportService', () => {
  let service: ReportService;
  let redis: Record<string, jest.Mock>;
  let kafka: Record<string, jest.Mock>;

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      lPush: jest.fn().mockResolvedValue(0),
      lRange: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
    };
    kafka = { sendEvent: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(ReportService);
    jest.clearAllMocks();
  });

  describe('createReport', () => {
    it('應建立檢舉並發送 Kafka 事件', async () => {
      const result = await service.createReport(
        'reporter-1', 'user', 'target-1', 'Spam content', 'Detailed description',
      );

      expect(result.id).toMatch(/^report-/);
      expect(result.reporterId).toBe('reporter-1');
      expect(result.targetType).toBe('user');
      expect(result.targetId).toBe('target-1');
      expect(result.reason).toBe('Spam content');
      expect(result.status).toBe('pending');
      expect(redis.set).toHaveBeenCalled();
      expect(redis.lPush).toHaveBeenCalledTimes(2);
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'user.reported',
        expect.objectContaining({ reporterId: 'reporter-1', targetType: 'user' }),
      );
    });

    it('應拋出 BadRequestException 當 reason 少於 3 字元時', async () => {
      await expect(service.createReport('r-1', 'user', 't-1', 'ab'))
        .rejects.toThrow(BadRequestException);
    });

    it('應拋出 BadRequestException 當 reason 為空時', async () => {
      await expect(service.createReport('r-1', 'user', 't-1', ''))
        .rejects.toThrow(BadRequestException);
    });

    it('應 trim reason 和 description', async () => {
      const result = await service.createReport(
        'r-1', 'post', 't-1', '  Spam  ', '  Details  ',
      );

      expect(result.reason).toBe('Spam');
      expect(result.description).toBe('Details');
    });

    it('description 為 undefined 時應正常運作', async () => {
      const result = await service.createReport('r-1', 'comment', 't-1', 'Reason here');

      expect(result.description).toBeUndefined();
    });
  });

  describe('getPendingReports', () => {
    it('無檢舉時應回傳空陣列', async () => {
      redis.lRange.mockResolvedValue([]);

      const result = await service.getPendingReports();

      expect(result).toEqual([]);
    });

    it('應回傳依時間排序的檢舉', async () => {
      const older = {
        id: 'report-1', reporterId: 'r-1', targetType: 'user', targetId: 't-1',
        reason: 'Spam', status: 'pending', createdAt: '2024-01-01T00:00:00Z',
      };
      const newer = {
        id: 'report-2', reporterId: 'r-2', targetType: 'post', targetId: 't-2',
        reason: 'Abuse', status: 'pending', createdAt: '2024-02-01T00:00:00Z',
      };
      redis.lRange.mockResolvedValue(['report-1', 'report-2']);
      redis.mget.mockResolvedValue([JSON.stringify(older), JSON.stringify(newer)]);

      const result = await service.getPendingReports();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('report-2');
      expect(result[1].id).toBe('report-1');
    });

    it('應跳過 null 值', async () => {
      redis.lRange.mockResolvedValue(['report-1', 'report-deleted']);
      redis.mget.mockResolvedValue([
        JSON.stringify({ id: 'report-1', createdAt: '2024-01-01T00:00:00Z' }),
        null,
      ]);

      const result = await service.getPendingReports();

      expect(result).toHaveLength(1);
    });
  });

  describe('updateReportStatus', () => {
    it('應更新檢舉狀態', async () => {
      const report = {
        id: 'report-1', reporterId: 'r-1', targetType: 'user', targetId: 't-1',
        reason: 'Spam', status: 'pending', createdAt: '2024-01-01T00:00:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(report));

      const result = await service.updateReportStatus('report-1', 'reviewed');

      expect(result.status).toBe('reviewed');
      expect(redis.set).toHaveBeenCalled();
    });

    it('找不到時應拋出 NotFoundException', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.updateReportStatus('report-missing', 'reviewed'))
        .rejects.toThrow(NotFoundException);
    });

    it('應支援所有狀態值', async () => {
      const report = {
        id: 'report-1', status: 'pending', createdAt: '2024-01-01T00:00:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(report));

      for (const status of ['reviewed', 'actioned', 'dismissed'] as const) {
        redis.get.mockResolvedValue(JSON.stringify({ ...report }));
        const result = await service.updateReportStatus('report-1', status);
        expect(result.status).toBe(status);
      }
    });
  });
});
