import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './http-exception.filter';

/**
 * Global exceptions module
 * Provides unified error handling across the application
 * 
 * Usage:
 * Import this module in your AppModule:
 * 
 * @Module({
 *   imports: [ExceptionsModule],
 *   ...
 * })
 * export class AppModule {}
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [],
})
export class ExceptionsModule {}