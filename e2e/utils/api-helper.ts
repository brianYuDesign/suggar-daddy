import { APIRequestContext } from '@playwright/test';

/**
 * API 請求助手
 * 用於測試中的後端 API 交互
 */
export class ApiHelper {
  private baseURL: string;

  constructor(private request: APIRequestContext, baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  /**
   * 創建新用戶
   */
  async createUser(userData: {
    email: string;
    password: string;
    displayName: string;
    userType: 'sugar_daddy' | 'sugar_baby';
    bio?: string;
  }) {
    const response = await this.request.post(`${this.baseURL}/api/auth/register`, {
      data: userData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create user: ${response.status()} ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * 用戶登入並取得 Token
   */
  async loginAndGetToken(email: string, password: string): Promise<string> {
    const response = await this.request.post(`${this.baseURL}/api/auth/login`, {
      data: { email, password },
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
    }

    const data = await response.json();
    return data.accessToken || data.token;
  }

  /**
   * 取得當前用戶資訊
   */
  async getCurrentUser(token: string) {
    const response = await this.request.get(`${this.baseURL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok()) {
      throw new Error(`Failed to get current user: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * 創建貼文
   */
  async createPost(token: string, postData: {
    content: string;
    visibility?: 'PUBLIC' | 'SUBSCRIBERS_ONLY' | 'PRIVATE';
    isPPV?: boolean;
    price?: number;
    mediaUrls?: string[];
  }) {
    const response = await this.request.post(`${this.baseURL}/api/posts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: postData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create post: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * 執行滑動操作
   */
  async swipe(token: string, targetUserId: string, action: 'LIKE' | 'PASS' | 'SUPER_LIKE') {
    const response = await this.request.post(`${this.baseURL}/api/matching/swipe`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        targetUserId,
        action,
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to swipe: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * 創建訂閱
   */
  async createSubscription(token: string, subscriptionData: {
    creatorId: string;
    tierId: string;
  }) {
    const response = await this.request.post(`${this.baseURL}/api/subscriptions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: subscriptionData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create subscription: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * 取得訂閱層級列表
   */
  async getSubscriptionTiers(creatorId: string) {
    const response = await this.request.get(
      `${this.baseURL}/api/subscriptions/creators/${creatorId}/tiers`
    );

    if (!response.ok()) {
      throw new Error(`Failed to get subscription tiers: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * 創建打賞
   */
  async createTip(token: string, tipData: {
    recipientId: string;
    amount: number;
    message?: string;
  }) {
    const response = await this.request.post(`${this.baseURL}/api/tips`, {
      headers: { Authorization: `Bearer ${token}` },
      data: tipData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create tip: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * 刪除用戶（測試清理用）
   */
  async deleteUser(token: string, userId: string) {
    const response = await this.request.delete(`${this.baseURL}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.ok();
  }

  /**
   * 刪除貼文（測試清理用）
   */
  async deletePost(token: string, postId: string) {
    const response = await this.request.delete(`${this.baseURL}/api/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.ok();
  }

  /**
   * 取得配對列表
   */
  async getMatches(token: string) {
    const response = await this.request.get(`${this.baseURL}/api/matching/matches`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok()) {
      throw new Error(`Failed to get matches: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * 更新用戶個人資料
   */
  async updateProfile(token: string, profileData: {
    name?: string;
    bio?: string;
    avatar?: string;
    coverImage?: string;
  }) {
    const response = await this.request.patch(`${this.baseURL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      data: profileData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to update profile: ${response.status()}`);
    }

    return response.json();
  }

  /**
   * 暫停用戶（管理員）
   */
  async suspendUser(adminToken: string, userId: string, reason?: string) {
    const response = await this.request.post(
      `${this.baseURL}/api/admin/users/${userId}/suspend`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { reason },
      }
    );

    if (!response.ok()) {
      throw new Error(`Failed to suspend user: ${response.status()}`);
    }

    return response.json();
  }
}
