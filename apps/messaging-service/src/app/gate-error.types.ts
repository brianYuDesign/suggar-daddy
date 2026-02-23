/**
 * [W-002] 門檻錯誤回應 — 正式化 Schema
 *
 * 當訊息發送被鑽石門檻阻擋時，以結構化 JSON 回應取代 JSON.stringify 字串。
 * HTTP 狀態碼：402 Payment Required
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export type GateErrorCode = 'DM_DIAMOND_GATE' | 'CHAT_DIAMOND_GATE';

export interface GateErrorResponse {
  /** 門檻類型代碼 */
  code: GateErrorCode;
  /** 使用者可讀的錯誤訊息 */
  message: string;
  /** 解鎖所需的鑽石數量 */
  diamondCost: number;
  /** 額外的門檻相關資訊 */
  metadata: {
    /** DM 門檻：收件人 ID */
    recipientId?: string;
    /** 聊天門檻：免費訊息上限 */
    threshold?: number;
    /** 聊天門檻：已發送訊息數 */
    sentCount?: number;
  };
}

/**
 * 建立門檻錯誤 HttpException（402 Payment Required）
 *
 * 回傳正式的 GateErrorResponse JSON 物件（非字串化）
 */
export class GateException extends HttpException {
  constructor(response: GateErrorResponse) {
    super(response, HttpStatus.PAYMENT_REQUIRED);
  }
}
