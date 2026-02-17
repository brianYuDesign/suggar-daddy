import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from './circuit-breaker.service';
import {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  API_GATEWAY_CONFIG,
  PAYMENT_SERVICE_CONFIG,
} from './circuit-breaker.config';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    service.shutdown();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBreaker', () => {
    it('should create a circuit breaker', () => {
      const action = jest.fn().mockResolvedValue('success');
      const breaker = service.createBreaker('test-service', action);
      
      expect(breaker).toBeDefined();
      expect(breaker.name).toBe('test-service');
    });

    it('should reuse existing circuit breaker', () => {
      const action = jest.fn().mockResolvedValue('success');
      const breaker1 = service.createBreaker('test-service', action);
      const breaker2 = service.createBreaker('test-service', action);
      
      expect(breaker1).toBe(breaker2);
    });
  });

  describe('wrap', () => {
    it('should wrap function with circuit breaker', async () => {
      const action = jest.fn().mockResolvedValue('success');
      const wrapped = service.wrap('test-wrap', action);
      
      const result = await wrapped();
      
      expect(result).toBe('success');
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should use fallback when circuit is open', async () => {
      const action = jest.fn().mockRejectedValue(new Error('Service error'));
      const fallback = jest.fn().mockReturnValue('fallback-value');
      
      const wrapped = service.wrap(
        'test-fallback',
        action,
        { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, volumeThreshold: 1, errorThresholdPercentage: 1 },
        fallback
      );
      
      // 觸發多次失敗開啟熔斷器
      for (let i = 0; i < 5; i++) {
        try {
          await wrapped();
        } catch (error) {
          // Expected to fail
        }
      }
      
      // 熔斷器應該已開啟，使用 fallback
      const result = await wrapped();
      expect(result).toBe('fallback-value');
    });
  });

  describe('getStatus', () => {
    it('should return circuit breaker status', async () => {
      const action = jest.fn().mockResolvedValue('success');
      service.wrap('status-test', action);
      
      await service.fire('status-test');
      
      const status = service.getStatus('status-test');
      
      expect(status).toBeDefined();
      expect(status?.name).toBe('status-test');
      expect(status?.state).toBe('closed');
      expect(status?.stats.successes).toBe(1);
    });

    it('should return null for non-existent breaker', () => {
      const status = service.getStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('getAllStatus', () => {
    it('should return all circuit breaker statuses', () => {
      const action = jest.fn().mockResolvedValue('success');
      service.wrap('test-1', action);
      service.wrap('test-2', action);
      
      const statuses = service.getAllStatus();
      
      expect(statuses).toHaveLength(2);
      expect(statuses.map(s => s.name)).toContain('test-1');
      expect(statuses.map(s => s.name)).toContain('test-2');
    });
  });

  describe('open and close', () => {
    it('should manually open circuit breaker', async () => {
      const action = jest.fn().mockResolvedValue('success');
      service.wrap('manual-test', action);
      
      service.open('manual-test');
      
      const status = service.getStatus('manual-test');
      expect(status?.state).toBe('open');
    });

    it('should manually close circuit breaker', async () => {
      const action = jest.fn().mockResolvedValue('success');
      service.wrap('manual-close-test', action);
      
      service.open('manual-close-test');
      expect(service.getStatus('manual-close-test')?.state).toBe('open');
      
      service.close('manual-close-test');
      expect(service.getStatus('manual-close-test')?.state).toBe('closed');
    });
  });

  describe('configurations', () => {
    it('should use API Gateway config correctly', () => {
      const action = jest.fn().mockResolvedValue('success');
      const breaker = service.createBreaker('api-gateway-test', action, API_GATEWAY_CONFIG);
      
      expect((breaker as any).options.timeout).toBe(5000);
      expect((breaker as any).options.errorThresholdPercentage).toBe(60);
    });

    it('should use Payment Service config correctly', () => {
      const action = jest.fn().mockResolvedValue('success');
      const breaker = service.createBreaker('payment-test', action, PAYMENT_SERVICE_CONFIG);
      
      expect((breaker as any).options.timeout).toBe(10000);
      expect((breaker as any).options.errorThresholdPercentage).toBe(40);
    });
  });

  describe('error scenarios', () => {
    it('should open circuit after threshold errors', async () => {
      let callCount = 0;
      const action = jest.fn().mockImplementation(async () => {
        callCount++;
        throw new Error(`Error ${callCount}`);
      });
      
      const wrapped = service.wrap(
        'error-threshold-test',
        action,
        {
          ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
          volumeThreshold: 3,
          errorThresholdPercentage: 50,
        }
      );
      
      // 觸發多次失敗
      for (let i = 0; i < 5; i++) {
        try {
          await wrapped();
        } catch (error) {
          // Expected to fail
        }
      }
      
      const status = service.getStatus('error-threshold-test');
      expect(status?.state).toBe('open');
      expect(status?.stats.failures).toBeGreaterThan(0);
    });

    it('should timeout long-running operations', async () => {
      const action = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return 'success';
      });
      
      const wrapped = service.wrap(
        'timeout-test',
        action,
        { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, timeout: 100 }
      );
      
      await expect(wrapped()).rejects.toThrow();
      
      const status = service.getStatus('timeout-test');
      expect(status?.stats.timeouts).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should remove circuit breaker', () => {
      const action = jest.fn().mockResolvedValue('success');
      service.wrap('remove-test', action);
      
      expect(service.getStatus('remove-test')).toBeDefined();
      
      service.removeBreaker('remove-test');
      
      expect(service.getStatus('remove-test')).toBeNull();
    });

    it('should shutdown all circuit breakers', () => {
      const action = jest.fn().mockResolvedValue('success');
      service.wrap('shutdown-test-1', action);
      service.wrap('shutdown-test-2', action);
      
      expect(service.getAllStatus()).toHaveLength(2);
      
      service.shutdown();
      
      expect(service.getAllStatus()).toHaveLength(0);
    });
  });
});
