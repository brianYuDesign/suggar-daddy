import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemMonitorService } from './system-monitor.service';
import { UserEntity } from '@suggar-daddy/database';
import { RedisService } from '@suggar-daddy/redis';
import axios from 'axios';

jest.mock('axios');

describe('SystemMonitorService', () => {
  let service: SystemMonitorService;
  let redis: jest.Mocked<
    Pick<RedisService, 'setex' | 'get'>
  >;
  let userRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    redis = {
      setex: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
    };

    userRepo = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemMonitorService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<SystemMonitorService>(SystemMonitorService);
    jest.clearAllMocks();

    // 恢復預設的 mock 行為
    redis.setex.mockResolvedValue(undefined);
    redis.get.mockResolvedValue(null);
    userRepo.query.mockResolvedValue([{ '?column?': 1 }]);
    (axios.get as jest.Mock).mockResolvedValue({ data: {} });
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    (axios.delete as jest.Mock).mockResolvedValue({ data: {} });
  });

  // =====================================================
  // getSystemHealth 測試
  // =====================================================
  describe('getSystemHealth', () => {
    it('Redis 和 DB 皆正常時應回傳 healthy', async () => {
      redis.setex.mockResolvedValue(undefined);
      redis.get.mockResolvedValue('pong');
      userRepo.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.getSystemHealth();

      expect(result.status).toBe('healthy');
      expect(result.services.redis.status).toBe('healthy');
      expect(result.services.database.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(redis.setex).toHaveBeenCalledWith('health:ping', 10, 'pong');
      expect(redis.get).toHaveBeenCalledWith('health:ping');
      expect(userRepo.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('Redis 回傳非預期值時應標示 degraded', async () => {
      redis.setex.mockResolvedValue(undefined);
      redis.get.mockResolvedValue('unexpected');
      userRepo.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.getSystemHealth();

      expect(result.services.redis.status).toBe('degraded');
      expect(result.status).toBe('degraded');
    });

    it('Redis 連線失敗時應標示 unhealthy', async () => {
      redis.setex.mockRejectedValue(new Error('Connection refused'));
      userRepo.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.getSystemHealth();

      expect(result.services.redis.status).toBe('unhealthy');
      expect(result.services.redis.error).toBe('Connection refused');
      expect(result.status).toBe('unhealthy');
    });

    it('DB 連線失敗時應標示 unhealthy', async () => {
      redis.setex.mockResolvedValue(undefined);
      redis.get.mockResolvedValue('pong');
      userRepo.query.mockRejectedValue(new Error('DB down'));

      const result = await service.getSystemHealth();

      expect(result.services.database.status).toBe('unhealthy');
      expect(result.services.database.error).toBe('DB down');
      expect(result.status).toBe('unhealthy');
    });

    it('應包含 latencyMs 指標', async () => {
      redis.setex.mockResolvedValue(undefined);
      redis.get.mockResolvedValue('pong');
      userRepo.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.getSystemHealth();

      expect(result.services.redis.latencyMs).toBeDefined();
      expect(typeof result.services.redis.latencyMs).toBe('number');
      expect(result.services.database.latencyMs).toBeDefined();
      expect(typeof result.services.database.latencyMs).toBe('number');
    });
  });

  // =====================================================
  // getKafkaStatus 測試
  // =====================================================
  describe('getKafkaStatus', () => {
    it('db-writer-service 正常時應回傳 connected', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: { status: 'ok', uptime: 12345 },
      });

      const result = await service.getKafkaStatus();

      expect(result.status).toBe('connected');
      expect(result.dbWriterHealth).toEqual({ status: 'ok', uptime: 12345 });
      expect(result.timestamp).toBeDefined();
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        { timeout: 5000 },
      );
    });

    it('db-writer-service 無法連線時應回傳 unknown', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.getKafkaStatus();

      expect(result.status).toBe('unknown');
      expect(result.error).toContain('無法連線至 db-writer-service');
      expect(result.error).toContain('ECONNREFUSED');
    });
  });

  // =====================================================
  // getDlqStats 測試
  // =====================================================
  describe('getDlqStats', () => {
    it('成功取得 DLQ 統計時應回傳資料', async () => {
      const dlqData = { totalMessages: 5, topicCounts: { 'user.created': 3 } };
      (axios.get as jest.Mock).mockResolvedValue({ data: dlqData });

      const result = await service.getDlqStats();

      expect(result).toEqual(dlqData);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/dlq/stats'),
        { timeout: 5000 },
      );
    });

    it('無法取得 DLQ 統計時應回傳錯誤訊息', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('timeout'));

      const result = await service.getDlqStats();

      expect(result.error).toContain('無法取得 DLQ 統計');
      expect(result.timestamp).toBeDefined();
    });
  });

  // =====================================================
  // getDlqMessages 測試
  // =====================================================
  describe('getDlqMessages', () => {
    it('成功取得 DLQ 訊息列表時應回傳資料', async () => {
      const messages = [{ id: 'dlq-1', topic: 'user.created', error: 'parse error' }];
      (axios.get as jest.Mock).mockResolvedValue({ data: messages });

      const result = await service.getDlqMessages();

      expect(result).toEqual(messages);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/dlq/messages'),
        { timeout: 5000 },
      );
    });

    it('無法取得 DLQ 訊息時應回傳錯誤', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('timeout'));

      const result = await service.getDlqMessages();

      expect(result.error).toContain('無法取得 DLQ 訊息');
      expect(result.messages).toEqual([]);
    });
  });

  // =====================================================
  // retryDlqMessage 測試
  // =====================================================
  describe('retryDlqMessage', () => {
    it('成功重試 DLQ 訊息時應回傳結果', async () => {
      const responseData = { success: true, messageId: 'dlq-1' };
      (axios.post as jest.Mock).mockResolvedValue({ data: responseData });

      const result = await service.retryDlqMessage('dlq-1');

      expect(result).toEqual(responseData);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/dlq/retry/dlq-1'),
        {},
        { timeout: 5000 },
      );
    });

    it('重試失敗時應回傳錯誤', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('not found'));

      const result = await service.retryDlqMessage('dlq-1');

      expect(result).toEqual({ success: false, error: expect.stringContaining('重試失敗') });
    });
  });

  // =====================================================
  // retryAllDlqMessages 測試
  // =====================================================
  describe('retryAllDlqMessages', () => {
    it('成功重試全部 DLQ 訊息時應回傳結果', async () => {
      const responseData = { success: true, retriedCount: 5 };
      (axios.post as jest.Mock).mockResolvedValue({ data: responseData });

      const result = await service.retryAllDlqMessages();

      expect(result).toEqual(responseData);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/dlq/retry-all'),
        {},
        { timeout: 10000 },
      );
    });

    it('重試全部失敗時應回傳錯誤', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('service down'));

      const result = await service.retryAllDlqMessages();

      expect(result).toEqual({ success: false, error: expect.stringContaining('重試全部失敗') });
    });
  });

  // =====================================================
  // deleteDlqMessage 測試
  // =====================================================
  describe('deleteDlqMessage', () => {
    it('成功刪除 DLQ 訊息時應回傳結果', async () => {
      const responseData = { success: true };
      (axios.delete as jest.Mock).mockResolvedValue({ data: responseData });

      const result = await service.deleteDlqMessage('dlq-1');

      expect(result).toEqual(responseData);
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/dlq/messages/dlq-1'),
        { timeout: 5000 },
      );
    });

    it('刪除失敗時應回傳錯誤', async () => {
      (axios.delete as jest.Mock).mockRejectedValue(new Error('not found'));

      const result = await service.deleteDlqMessage('dlq-1');

      expect(result).toEqual({ success: false, error: expect.stringContaining('刪除失敗') });
    });
  });

  // =====================================================
  // purgeDlqMessages 測試
  // =====================================================
  describe('purgeDlqMessages', () => {
    it('成功清除所有 DLQ 訊息時應回傳結果', async () => {
      const responseData = { success: true, purgedCount: 10 };
      (axios.delete as jest.Mock).mockResolvedValue({ data: responseData });

      const result = await service.purgeDlqMessages();

      expect(result).toEqual(responseData);
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/dlq/purge'),
        { timeout: 10000 },
      );
    });

    it('清除失敗時應回傳錯誤', async () => {
      (axios.delete as jest.Mock).mockRejectedValue(new Error('service error'));

      const result = await service.purgeDlqMessages();

      expect(result).toEqual({ success: false, error: expect.stringContaining('清除失敗') });
    });
  });

  // =====================================================
  // getConsistencyMetrics 測試
  // =====================================================
  describe('getConsistencyMetrics', () => {
    it('成功取得一致性指標時應回傳資料', async () => {
      const metricsData = { totalChecked: 100, totalInconsistencies: 2 };
      (axios.get as jest.Mock).mockResolvedValue({ data: metricsData });

      const result = await service.getConsistencyMetrics();

      expect(result).toEqual(metricsData);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/consistency/metrics'),
        { timeout: 5000 },
      );
    });

    it('無法取得一致性指標時應回傳錯誤訊息', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      const result = await service.getConsistencyMetrics();

      expect(result.error).toContain('無法取得一致性指標');
      expect(result.error).toContain('Service unavailable');
      expect(result.timestamp).toBeDefined();
    });
  });
});
