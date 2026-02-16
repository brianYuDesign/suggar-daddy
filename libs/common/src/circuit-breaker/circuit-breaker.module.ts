import { Module, Global } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

/**
 * Circuit Breaker 模組
 * 使用 @Global() 使服務在整個應用中可用
 */
@Global()
@Module({
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class CircuitBreakerModule {}
