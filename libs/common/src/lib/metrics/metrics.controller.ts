import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentMetricsService } from './payment-metrics.service';

/**
 * Metrics Controller
 * 
 * Exposes Prometheus metrics endpoint for monitoring
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly paymentMetrics: PaymentMetricsService) {}

  @Get()
  @ApiExcludeEndpoint()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): string {
    return this.paymentMetrics.exportPrometheusMetrics();
  }

  @Get('json')
  @ApiTags('Monitoring')
  @ApiOperation({ 
    summary: 'Get metrics (JSON)',
    description: 'Get current metrics in JSON format for debugging'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Metrics retrieved successfully',
    schema: {
      example: {
        orphanTransactions: {
          detected: 5,
          processingFailures: 1,
          processingDelaySeconds: 120,
          detectionRatePerMinute: 0.5,
          lastDetectionTime: '2024-01-20T15:00:00Z'
        },
        transactions: {
          byStatus: {
            pending: 10,
            succeeded: 1500,
            failed: 25,
            refunded: 5
          }
        }
      }
    }
  })
  getMetricsJson() {
    return this.paymentMetrics.getMetrics();
  }
}
