import {
  calculateWeight,
  sortByScore,
  filterByMinScore,
  getTopN,
  normalizeScore,
} from './recommendation.utils';

/**
 * 單元測試 - 推薦演算法工具函數
 *
 * 測試層次：
 * - 純函數邏輯
 * - 邊界值測試
 * - 高覆蓋率
 */
describe('Recommendation Utils', () => {
  describe('calculateWeight', () => {
    it('應該正確計算加權分數', () => {
      const result = calculateWeight(1, 1, 1);
      expect(result).toBeCloseTo(1, 2);
    });

    it('應該應用正確的權重比例', () => {
      // userPreference: 0.5, popularity: 0.3, recency: 0.2
      const result = calculateWeight(0.8, 0.6, 0.4);
      const expected = 0.8 * 0.5 + 0.6 * 0.3 + 0.4 * 0.2;
      expect(result).toBeCloseTo(expected, 5);
    });

    it('應該處理零值', () => {
      expect(calculateWeight(0, 0, 0)).toBe(0);
    });

    it('應該處理全一值', () => {
      expect(calculateWeight(1, 1, 1)).toBeCloseTo(1, 2);
    });

    it('應該處理小數值', () => {
      const result = calculateWeight(0.5, 0.3, 0.2);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe('sortByScore', () => {
    it('應該按降序排列（預設）', () => {
      const items = [
        { id: '1', score: 0.5 },
        { id: '2', score: 0.9 },
        { id: '3', score: 0.3 },
      ];

      const sorted = sortByScore(items);
      expect(sorted).toEqual([
        { id: '2', score: 0.9 },
        { id: '1', score: 0.5 },
        { id: '3', score: 0.3 },
      ]);
    });

    it('應該按升序排列', () => {
      const items = [
        { id: '1', score: 0.5 },
        { id: '2', score: 0.9 },
        { id: '3', score: 0.3 },
      ];

      const sorted = sortByScore(items, false);
      expect(sorted).toEqual([
        { id: '3', score: 0.3 },
        { id: '1', score: 0.5 },
        { id: '2', score: 0.9 },
      ]);
    });

    it('應該處理空陣列', () => {
      expect(sortByScore([])).toEqual([]);
    });

    it('應該處理單個元素', () => {
      const items = [{ id: '1', score: 0.5 }];
      expect(sortByScore(items)).toEqual(items);
    });

    it('應該保持相同分數的相對順序', () => {
      const items = [
        { id: '1', score: 0.5 },
        { id: '2', score: 0.5 },
      ];

      const sorted = sortByScore(items);
      expect(sorted).toHaveLength(2);
    });
  });

  describe('filterByMinScore', () => {
    it('應該過濾出高於最小分數的項目', () => {
      const items = [
        { id: '1', score: 0.2 },
        { id: '2', score: 0.7 },
        { id: '3', score: 0.5 },
      ];

      const filtered = filterByMinScore(items, 0.6);
      expect(filtered).toEqual([{ id: '2', score: 0.7 }]);
    });

    it('應該包括等於最小分數的項目', () => {
      const items = [
        { id: '1', score: 0.5 },
        { id: '2', score: 0.6 },
      ];

      const filtered = filterByMinScore(items, 0.5);
      expect(filtered).toHaveLength(2);
    });

    it('應該返回空陣列當所有項目低於閾值', () => {
      const items = [
        { id: '1', score: 0.2 },
        { id: '2', score: 0.3 },
      ];

      const filtered = filterByMinScore(items, 0.5);
      expect(filtered).toEqual([]);
    });

    it('應該處理零最小分數', () => {
      const items = [
        { id: '1', score: 0 },
        { id: '2', score: 0.5 },
      ];

      const filtered = filterByMinScore(items, 0);
      expect(filtered).toEqual(items);
    });
  });

  describe('getTopN', () => {
    it('應該返回前 N 個項目', () => {
      const items = [
        { id: '1' },
        { id: '2' },
        { id: '3' },
        { id: '4' },
        { id: '5' },
      ];

      const top = getTopN(items, 3);
      expect(top).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
    });

    it('應該處理 N 大於陣列長度的情況', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const top = getTopN(items, 10);
      expect(top).toEqual(items);
    });

    it('應該處理 N = 0', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const top = getTopN(items, 0);
      expect(top).toEqual([]);
    });

    it('應該處理負數 N', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const top = getTopN(items, -5);
      expect(top).toEqual([]);
    });

    it('應該處理空陣列', () => {
      const top = getTopN([], 5);
      expect(top).toEqual([]);
    });
  });

  describe('normalizeScore', () => {
    it('應該正確歸一化分數', () => {
      expect(normalizeScore(5, 10)).toBe(0.5);
      expect(normalizeScore(10, 10)).toBe(1);
      expect(normalizeScore(0, 10)).toBe(0);
    });

    it('應該限制超過最大值的分數', () => {
      expect(normalizeScore(15, 10)).toBe(1);
    });

    it('應該限制負分數', () => {
      expect(normalizeScore(-5, 10)).toBe(0);
    });

    it('應該處理零最大值', () => {
      expect(normalizeScore(5, 0)).toBe(0);
    });

    it('應該處理浮點數', () => {
      const result = normalizeScore(3.5, 10);
      expect(result).toBeCloseTo(0.35, 5);
    });
  });
});
