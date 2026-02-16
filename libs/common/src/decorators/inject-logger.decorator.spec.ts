import { InjectLogger } from './inject-logger.decorator';
import { Logger } from '@nestjs/common';

class TestService {
  @InjectLogger()
  private readonly logger!: Logger;

  testLog() {
    this.logger.log('Test message');
  }
}

describe('InjectLogger Decorator', () => {
  it('should inject logger with class name as context', () => {
    const service = new TestService();
    
    // 檢查 logger 已被注入
    expect(service['logger']).toBeDefined();
    expect(service['logger']).toBeInstanceOf(Logger);
  });

  it('should use class name as logger context', () => {
    const service = new TestService();
    const logger = service['logger'];
    
    // 檢查 logger context 是類名
    expect((logger as any).context).toBe('TestService');
  });

  it('should make logger immutable', () => {
    const service = new TestService();
    const originalLogger = service['logger'];
    
    // 嘗試修改 logger 應該失敗
    expect(() => {
      (service as any).logger = new Logger('AnotherContext');
    }).toThrow();
    
    // logger 應該保持不變
    expect(service['logger']).toBe(originalLogger);
  });

  it('should work with multiple instances', () => {
    const service1 = new TestService();
    const service2 = new TestService();
    
    // 每個實例都應該有自己的 logger
    expect(service1['logger']).toBeDefined();
    expect(service2['logger']).toBeDefined();
    expect(service1['logger']).not.toBe(service2['logger']);
  });
});
