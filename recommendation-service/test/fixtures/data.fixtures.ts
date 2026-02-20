/**
 * E2E 測試 Fixtures - 測試數據工廠
 *
 * 用於建立一致、可重複使用的測試數據
 */

export interface TestUser {
  id: string;
  name: string;
  email: string;
  interests: string[];
}

export interface TestContent {
  id: string;
  title: string;
  tags: string[];
  category: string;
}

/**
 * 用戶 Fixture Factory
 */
export const createTestUser = (overrides?: Partial<TestUser>): TestUser => {
  const id = Math.random().toString(36).substring(7);
  return {
    id: `user-${id}`,
    name: 'Test User',
    email: `user-${id}@test.com`,
    interests: ['tech', 'music', 'sports'],
    ...overrides,
  };
};

/**
 * 內容 Fixture Factory
 */
export const createTestContent = (
  overrides?: Partial<TestContent>,
): TestContent => {
  const id = Math.random().toString(36).substring(7);
  return {
    id: `content-${id}`,
    title: 'Test Content',
    tags: ['test', 'example'],
    category: 'general',
    ...overrides,
  };
};

/**
 * 批量創建測試用戶
 */
export const createTestUsers = (count: number): TestUser[] => {
  return Array.from({ length: count }, (_, i) => {
    return createTestUser({
      id: `user-${i}`,
      email: `user${i}@test.com`,
    });
  });
};

/**
 * 批量創建測試內容
 */
export const createTestContents = (count: number): TestContent[] => {
  return Array.from({ length: count }, (_, i) => {
    return createTestContent({
      id: `content-${i}`,
      title: `Test Content ${i}`,
    });
  });
};

/**
 * 模擬推薦結果
 */
export const mockRecommendationResults = () => [
  {
    contentId: 'content-1',
    score: 0.95,
    reason: 'Based on your interests in tech',
  },
  {
    contentId: 'content-2',
    score: 0.87,
    reason: 'Popular in your category',
  },
  {
    contentId: 'content-3',
    score: 0.76,
    reason: 'Similar to content you liked',
  },
];
