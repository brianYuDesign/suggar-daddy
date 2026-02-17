// @ts-nocheck
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { PaymentMetricsService } from './payment-metrics.service';

/**
 * Metrics response type
 */
interface MetricsResponse {
  orphanTransactions: {
    detected: number;
    processingFailures: number;
    processingDelaySeconds: number;
    detectionRatePerMinute: number;
    lastDetectionTime: string;
  };
  transactions: {
    byStatus: {
      pending: number;
      succeeded: number;
      failed: number;
      refunded: number;
    };
  };
}

/**
 * Metrics Controller
 * 
 * Exposes Prometheus metrics endpoint for monitoring
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly paymentMetrics: PaymentMetricsService) {}

  @Get('')
  @ApiExcludeEndpoint()
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
  getMetricsJson(): MetricsResponse {
    return this.paymentMetrics.getMetrics();
  }
}
