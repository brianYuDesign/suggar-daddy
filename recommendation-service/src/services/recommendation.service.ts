import { Injectable } from '@nestjs/common';

export interface IRecommendationResult {
  contentId: string;
  score: number;
  reason: string;
}

/**
 * 推薦演算法服務 - 示例服務
 */
@Injectable()
export class RecommendationService {
  /**
   * 根據用戶興趣和交互歷史生成推薦
   */
  async getRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<IRecommendationResult[]> {
    // 簡化邏輯，實際會從數據庫查詢
    return [
      {
        contentId: `content-${userId}-1`,
        score: 0.95,
        reason: 'Based on interests',
      },
    ];
  }

  /**
   * 計算推薦分數
   */
  calculateScore(userScore: number, contentScore: number): number {
    return (userScore + contentScore) / 2;
  }

  /**
   * 驗證推薦結果
   */
  validateResult(result: IRecommendationResult): boolean {
    return (
      !!result.contentId &&
      result.score >= 0 &&
      result.score <= 1 &&
      !!result.reason
    );
  }
}
