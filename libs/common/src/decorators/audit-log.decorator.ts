import { Logger } from '@nestjs/common';

/**
 * Audit Log Decorator
 * 
 * 記錄金額計算和重要業務操作的審計日誌
 * 用於問題排查和合規審計
 */
export function AuditLog(operation: string, options?: {
  includeResult?: boolean;
  includeArgs?: boolean;
  logLevel?: 'log' | 'warn' | 'error';
}) {
  const { 
    includeResult = true, 
    includeArgs = true,
    logLevel = 'log'
  } = options || {};

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(`${target.constructor.name}:${propertyKey}`);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      
      const auditData: Record<string, any> = {
        auditId,
        operation,
        method: propertyKey,
        timestamp: new Date().toISOString(),
        userId: (this as any).currentUserId || 'system',
      };

      if (includeArgs) {
        auditData['arguments'] = args.map((arg, index) => {
          // 隱藏敏感資訊
          if (typeof arg === 'object' && arg !== null) {
            const sanitized = { ...arg };
            if ('password' in sanitized) sanitized.password = '***';
            if ('token' in sanitized) sanitized.token = '***';
            if ('creditCard' in sanitized) sanitized.creditCard = '***';
            return sanitized;
          }
          return arg;
        });
      }

      logger.log(`[AUDIT START] ${operation}`, auditData);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        const successAudit = {
          ...auditData,
          status: 'success',
          duration: `${duration}ms`,
        };

        if (includeResult) {
          // 對於金額計算，特別記錄結果
          if (typeof result === 'object' && result !== null) {
            if ('amount' in result) (successAudit as any).amount = (result as any).amount;
            if ('total' in result) (successAudit as any).total = (result as any).total;
            if ('balance' in result) (successAudit as any).balance = (result as any).balance;
          }
        }

        logger[logLevel](`[AUDIT SUCCESS] ${operation}`, successAudit);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        const errorAudit = {
          ...auditData,
          status: 'error',
          duration: `${duration}ms`,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          } : String(error),
        };

        logger.error(`[AUDIT ERROR] ${operation}`, errorAudit);

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Amount Calculation Audit
 * 
 * 專門用於金額計算的審計裝飾器
 * 自動記錄輸入金額和計算結果
 */
export function AuditAmountCalculation(calculationType: string) {
  return AuditLog(`Amount Calculation: ${calculationType}`, {
    includeResult: true,
    includeArgs: true,
    logLevel: 'log',
  });
}

/**
 * Payment Operation Audit
 * 
 * 專門用於支付操作的審計裝飾器
 */
export function AuditPaymentOperation(operationType: string) {
  return AuditLog(`Payment Operation: ${operationType}`, {
    includeResult: true,
    includeArgs: true,
    logLevel: 'warn',
  });
}
