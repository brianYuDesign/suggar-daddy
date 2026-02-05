/**
 * 共用工具函數
 */

export function createHash(input: string): string {
  // Placeholder - 實際使用 crypto.createHash
  return Buffer.from(input).toString('base64').slice(0, 32);
}
