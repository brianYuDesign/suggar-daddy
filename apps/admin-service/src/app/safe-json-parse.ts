import { Logger } from '@nestjs/common';

const logger = new Logger('SafeJsonParse');

/**
 * 安全解析 JSON 字串，失敗時回傳 null 而非拋出例外。
 * 搭配 TypeScript 泛型使用，呼叫端仍需自行處理 null 情況。
 */
export function safeJsonParse<T>(raw: string, context?: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    logger.warn(
      `JSON parse failed${context ? ' (' + context + ')' : ''}: ${raw.slice(0, 120)}`,
    );
    return null;
  }
}
