import { Injectable } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { 
  SEMRESATTRS_SERVICE_NAME, 
  SEMRESATTRS_SERVICE_VERSION, 
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT 
} from '@opentelemetry/semantic-conventions';

@Injectable()
export class TracingService {
  private sdk: NodeSDK;

  constructor() {}

  init(serviceName: string) {
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
            enabled: false, // Disable file system instrumentation
          },
        }),
      ],
    });

    this.sdk.start();
    console.log(`✅ Tracing initialized for ${serviceName}`);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.sdk
        .shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
    });
  }

  getSDK(): NodeSDK {
    return this.sdk;
  }
}
