import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TracingService {
  private sdk: any;
  private readonly logger = new Logger(TracingService.name);

  constructor() {}

  async init(serviceName: string) {
    try {
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      const {
        SEMRESATTRS_SERVICE_NAME,
        SEMRESATTRS_SERVICE_VERSION,
        SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
      } = await import('@opentelemetry/semantic-conventions');

      const traceExporter = new OTLPTraceExporter({
        url: process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',
      });

      this.sdk = new NodeSDK({
        resource: resourceFromAttributes({
          [SEMRESATTRS_SERVICE_NAME]: serviceName,
          [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
          [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
        }),
        traceExporter,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
          }),
        ],
      });

      this.sdk.start();
      this.logger.log(`Tracing initialized for ${serviceName}`);

      process.on('SIGTERM', () => {
        this.sdk
          ?.shutdown()
          .then(() => this.logger.log('Tracing terminated'))
          .catch((error: unknown) => this.logger.error('Error terminating tracing', error))
          .finally(() => process.exit(0));
      });
    } catch {
      this.logger.warn(`Tracing disabled for ${serviceName} (OpenTelemetry packages not available)`);
    }
  }

  getSDK() {
    return this.sdk;
  }
}
