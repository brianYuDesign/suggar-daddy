import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<any> {
    const tracer = trace.getTracer('nest-app');
    const request = executionContext.switchToHttp().getRequest();
    const { method, url, headers } = request;

    return tracer.startActiveSpan(`${method} ${url}`, (span) => {
      // Add attributes
      span.setAttribute('http.method', method);
      span.setAttribute('http.url', url);
      span.setAttribute('http.user_agent', headers['user-agent'] || 'unknown');

      return next.handle().pipe(
        tap({
          next: (data) => {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
          },
          error: (error) => {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
            span.end();
          },
        }),
      );
    });
  }
}
