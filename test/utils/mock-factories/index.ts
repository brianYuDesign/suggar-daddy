/**
 * Mock Factories Index
 * 
 * 統一導出所有 Mock Factories
 */

export { UserFactory, type MockUser } from './user.factory';
export { PostFactory, type MockPost } from './post.factory';
export { TransactionFactory, type MockTransaction } from './transaction.factory';

/**
 * 重置所有 factories 的計數器
 */
export function resetAllFactories(): void {
  UserFactory.reset();
  PostFactory.reset();
  TransactionFactory.reset();
}
