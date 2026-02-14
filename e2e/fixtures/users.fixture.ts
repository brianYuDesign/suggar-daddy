/**
 * 測試用戶數據 Fixtures
 * 用於 E2E 測試的模擬數據
 */

export const testUsers = {
  creator: {
    id: 'user-creator-001',
    email: 'creator@test.com',
    password: 'Test1234!',
    role: 'CREATOR',
    profile: {
      name: 'Test Creator',
      displayName: 'TestCreator',
      bio: '這是一個測試創作者帳號',
      avatar: 'https://via.placeholder.com/150',
      coverImage: 'https://via.placeholder.com/800x300',
      verified: true,
    },
    subscription: {
      plan: 'PREMIUM',
      status: 'ACTIVE',
      expiresAt: '2026-12-31',
    },
    stats: {
      followers: 1234,
      following: 567,
      posts: 89,
    },
  },
  
  subscriber: {
    id: 'user-subscriber-001',
    email: 'subscriber@test.com',
    password: 'Test1234!',
    role: 'SUBSCRIBER',
    profile: {
      name: 'Test Subscriber',
      displayName: 'TestSubscriber',
      bio: '這是一個測試探索者帳號',
      avatar: 'https://via.placeholder.com/150',
      verified: false,
    },
    subscription: {
      plan: 'BASIC',
      status: 'ACTIVE',
      expiresAt: '2026-06-30',
    },
    stats: {
      followers: 45,
      following: 123,
      posts: 5,
    },
  },
  
  admin: {
    id: 'user-admin-001',
    email: 'admin@test.com',
    password: 'Admin1234!',
    role: 'ADMIN',
    profile: {
      name: 'Test Admin',
      displayName: 'TestAdmin',
      bio: '系統管理員',
      avatar: 'https://via.placeholder.com/150',
      verified: true,
    },
  },
  
  newUser: {
    email: 'newuser@test.com',
    password: 'NewUser1234!',
    profile: {
      name: 'New Test User',
      displayName: 'NewTestUser',
    },
  },
};

export const testCreators = [
  {
    id: 'creator-001',
    name: '創作者 A',
    avatar: 'https://via.placeholder.com/150',
    bio: '專業攝影師',
    followers: 5000,
    verified: true,
    subscriptionPrice: 999,
  },
  {
    id: 'creator-002',
    name: '創作者 B',
    avatar: 'https://via.placeholder.com/150',
    bio: '旅遊部落客',
    followers: 3200,
    verified: true,
    subscriptionPrice: 799,
  },
  {
    id: 'creator-003',
    name: '創作者 C',
    avatar: 'https://via.placeholder.com/150',
    bio: '健身教練',
    followers: 8900,
    verified: false,
    subscriptionPrice: 1299,
  },
];

export default {
  testUsers,
  testCreators,
};
