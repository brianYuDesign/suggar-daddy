/**
 * 推薦演算法工具函數
 */

/**
 * 計算推薦分數權重
 */
export function calculateWeight(
  userPreference: number,
  popularity: number,
  recency: number,
): number {
  const weights = {
    userPreference: 0.5,
    popularity: 0.3,
    recency: 0.2,
  };

  return (
    userPreference * weights.userPreference +
    popularity * weights.popularity +
    recency * weights.recency
  );
}

/**
 * 對推薦結果按分數排序
 */
export function sortByScore<T extends { score: number }>(
  items: T[],
  descending = true,
): T[] {
  return items.sort((a, b) =>
    descending ? b.score - a.score : a.score - b.score,
  );
}

/**
 * 過濾推薦結果（最小分數閾值）
 */
export function filterByMinScore<T extends { score: number }>(
  items: T[],
  minScore: number,
): T[] {
  return items.filter((item) => item.score >= minScore);
}

/**
 * 獲取推薦的前 N 個結果
 */
export function getTopN<T>(items: T[], n: number): T[] {
  return items.slice(0, Math.max(0, n));
}

/**
 * 歸一化分數到 0-1 範圍
 */
export function normalizeScore(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}
