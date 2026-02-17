import { Module, Global } from '@nestjs/common';
import { PaymentMetricsService } from './payment-metrics.service';
import { MetricsController } from './metrics.controller';

/**
 * Metrics Module
 * 
 * Global module for collecting and exposing Prometheus metrics
 */
@Global()
@Module({
  providers: [PaymentMetricsService],
  controllers: [MetricsController],
  exports: [PaymentMetricsService],
})
export class MetricsModule {}
