import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CircuitBreakerService } from '@suggar-daddy/common';

@Controller()
export class AppController {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  @Get()
  root() {
    return {
      service: 'api-gateway',
      message: 'Use /api/auth, /api/users, /api/matching, /api/posts, etc.',
      health: '/health',
      circuitBreakers: '/circuit-breakers',
    };
  }

  @Get('circuit-breakers')
  getCircuitBreakers() {
    return {
      breakers: this.circuitBreaker.getAllStatus(),
    };
  }

  @Get('circuit-breakers/:name')
  getCircuitBreaker(@Param('name') name: string) {
    const status = this.circuitBreaker.getStatus(name);
    if (!status) {
      throw new NotFoundException(`Circuit breaker not found: ${name}`);
    }
    return status;
  }
}
