import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Gateway');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      const msg = `${method} ${originalUrl} ${statusCode} ${duration}ms [${ip}]`;
      this.logger[level](msg);
    });

    next();
  }
}
