import { Logger } from '@nestjs/common';

/**
 * 裝飾器：自動注入 Logger 實例
 * 
 * 使用方式：
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   @InjectLogger()
 *   private readonly logger!: Logger;
 * 
 *   someMethod() {
 *     this.logger.log('Hello');
 *   }
 * }
 * ```
 * 
 * 這個裝飾器會自動：
 * 1. 創建一個 Logger 實例
 * 2. 使用類名作為 logger context
 * 3. 將 logger 注入到裝飾的屬性中
 */
export function InjectLogger(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    // 在屬性初始化時創建 logger
    const getter = function () {
      // 創建 logger 實例，使用類名作為 context
      const logger = new Logger(this.constructor.name);
      
      // 定義不可變的屬性
      Object.defineProperty(this, propertyKey, {
        value: logger,
        writable: false,
        enumerable: false,
        configurable: false,
      });
      
      return logger;
    };

    // 定義 getter
    Object.defineProperty(target, propertyKey, {
      get: getter,
      enumerable: false,
      configurable: true,
    });
  };
}
