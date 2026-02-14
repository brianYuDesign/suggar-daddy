/**
 * 測試交易數據 Fixtures
 */

export const testPayments = [
  {
    id: 'payment-001',
    userId: 'user-subscriber-001',
    amount: 999,
    currency: 'TWD',
    status: 'SUCCESS',
    method: 'STRIPE',
    description: '訂閱 Premium 方案',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'payment-002',
    userId: 'user-subscriber-001',
    amount: 299,
    currency: 'TWD',
    status: 'SUCCESS',
    method: 'STRIPE',
    description: '購買 PPV 內容',
    createdAt: '2026-02-10T14:30:00Z',
  },
  {
    id: 'payment-003',
    userId: 'user-subscriber-001',
    amount: 1500,
    currency: 'TWD',
    status: 'FAILED',
    method: 'STRIPE',
    description: '訂閱年度方案',
    createdAt: '2026-02-12T09:00:00Z',
    errorMessage: '卡片餘額不足',
  },
];

export const testSubscriptions = [
  {
    id: 'subscription-001',
    userId: 'user-subscriber-001',
    creatorId: 'creator-001',
    plan: 'BASIC',
    status: 'ACTIVE',
    amount: 999,
    currency: 'TWD',
    interval: 'MONTHLY',
    currentPeriodStart: '2026-02-01T00:00:00Z',
    currentPeriodEnd: '2026-03-01T00:00:00Z',
    cancelAtPeriodEnd: false,
  },
  {
    id: 'subscription-002',
    userId: 'user-creator-001',
    plan: 'PREMIUM',
    status: 'ACTIVE',
    amount: 1999,
    currency: 'TWD',
    interval: 'MONTHLY',
    currentPeriodStart: '2026-01-15T00:00:00Z',
    currentPeriodEnd: '2026-02-15T00:00:00Z',
    cancelAtPeriodEnd: false,
  },
];

export const testWithdrawals = [
  {
    id: 'withdrawal-001',
    userId: 'user-creator-001',
    amount: 5000,
    currency: 'TWD',
    status: 'PENDING',
    bankAccount: {
      bankName: '測試銀行',
      accountNumber: '****1234',
    },
    requestedAt: '2026-02-14T10:00:00Z',
  },
  {
    id: 'withdrawal-002',
    userId: 'user-creator-001',
    amount: 3000,
    currency: 'TWD',
    status: 'APPROVED',
    bankAccount: {
      bankName: '測試銀行',
      accountNumber: '****1234',
    },
    requestedAt: '2026-02-01T10:00:00Z',
    approvedAt: '2026-02-02T14:00:00Z',
    processedAt: '2026-02-03T09:00:00Z',
  },
];

export default {
  testPayments,
  testSubscriptions,
  testWithdrawals,
};
