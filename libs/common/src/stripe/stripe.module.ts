import { Module, Global } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CircuitBreakerService } from '../circuit-breaker';

@Global()
@Module({
  providers: [
    {
      provide: StripeService,
      useFactory: (circuitBreaker?: CircuitBreakerService) => {
        const service = new StripeService();
        if (circuitBreaker) {
          service.setCircuitBreaker(circuitBreaker);
        }
        return service;
      },
      inject: [{ token: CircuitBreakerService, optional: true }],
    },
  ],
  exports: [StripeService],
})
export class StripeModule {}