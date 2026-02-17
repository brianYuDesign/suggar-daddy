/**
 * 測試數據工廠
 * 提供建立測試數據的方法
 */

import { TestHelpers } from './test-helpers';

export class TestFixtures {
  /**
   * 建立測試使用者
   */
  static createUser(overrides = {}) {
    return {
      email: TestHelpers.randomEmail(),
      username: `user_${TestHelpers.randomString()}`,
      password: 'Test1234!',
      role: 'user',
      status: 'active',
      ...overrides,
    };
  }

  /**
   * 建立測試創作者
   */
  static createCreator(overrides = {}) {
    return this.createUser({
      role: 'creator',
      profile: {
        displayName: `Creator ${TestHelpers.randomString()}`,
        bio: 'Test creator bio',
        subscriptionPrice: 9.99,
      },
      ...overrides,
    });
  }

  /**
   * 建立測試訂閱
   */
  static createSubscription(userId: string, creatorId: string, overrides = {}) {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);

    return {
      userId,
      creatorId,
      status: 'active',
      startDate: now,
      endDate: nextMonth,
      amount: 9.99,
      currency: 'USD',
      ...overrides,
    };
  }

  /**
   * 建立測試貼文
   */
  static createPost(authorId: string, overrides = {}) {
    return {
      authorId,
      title: `Test Post ${TestHelpers.randomString()}`,
      content: 'This is a test post content.',
      type: 'text',
      visibility: 'public',
      isPaid: false,
      price: 0,
      ...overrides,
    };
  }

  /**
   * 建立付費貼文
   */
  static createPaidPost(authorId: string, price: number, overrides = {}) {
    return this.createPost(authorId, {
      isPaid: true,
      price,
      visibility: 'subscribers',
      ...overrides,
    });
  }

  /**
   * 建立測試交易
   */
  static createTransaction(userId: string, overrides = {}) {
    return {
      userId,
      type: 'subscription',
      amount: 9.99,
      currency: 'USD',
      status: 'completed',
      provider: 'stripe',
      providerId: `pi_${TestHelpers.randomString(14)}`,
      ...overrides,
    };
  }

  /**
   * 建立測試支付
   */
  static createPayment(userId: string, amount: number, overrides = {}) {
    return {
      userId,
      amount,
      currency: 'USD',
      status: 'pending',
      method: 'card',
      stripePaymentIntentId: `pi_${TestHelpers.randomString(14)}`,
      ...overrides,
    };
  }

  /**
   * 建立測試小費
   */
  static createTip(fromUserId: string, toUserId: string, amount: number, overrides = {}) {
    return {
      fromUserId,
      toUserId,
      amount,
      currency: 'USD',
      message: 'Great content!',
      status: 'completed',
      ...overrides,
    };
  }

  /**
   * 建立測試貼文購買
   */
  static createPostPurchase(userId: string, postId: string, amount: number, overrides = {}) {
    return {
      userId,
      postId,
      amount,
      currency: 'USD',
      status: 'completed',
      transactionId: `txn_${TestHelpers.randomString()}`,
      ...overrides,
    };
  }

  /**
   * 建立測試媒體
   */
  static createMedia(userId: string, overrides = {}) {
    return {
      userId,
      type: 'image',
      url: `https://example.com/image_${TestHelpers.randomString()}.jpg`,
      filename: `image_${TestHelpers.randomString()}.jpg`,
      size: TestHelpers.randomNumber(1000, 5000000),
      mimeType: 'image/jpeg',
      ...overrides,
    };
  }

  /**
   * 建立測試通知
   */
  static createNotification(userId: string, overrides = {}) {
    return {
      userId,
      type: 'subscription',
      title: 'New Subscription',
      message: 'You have a new subscriber!',
      read: false,
      ...overrides,
    };
  }

  /**
   * 建立測試訊息
   */
  static createMessage(fromUserId: string, toUserId: string, overrides = {}) {
    return {
      fromUserId,
      toUserId,
      content: 'Test message content',
      type: 'text',
      read: false,
      ...overrides,
    };
  }

  /**
   * 建立 Kafka 事件
   */
  static createKafkaEvent(eventType: string, data: any) {
    return {
      eventId: TestHelpers.randomString(16),
      eventType,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  /**
   * 建立使用者註冊事件
   */
  static createUserRegisteredEvent(user: any) {
    return this.createKafkaEvent('user.registered', {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
  }

  /**
   * 建立訂閱建立事件
   */
  static createSubscriptionCreatedEvent(subscription: any) {
    return this.createKafkaEvent('subscription.created', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      creatorId: subscription.creatorId,
      amount: subscription.amount,
    });
  }

  /**
   * 建立支付成功事件
   */
  static createPaymentSuccessEvent(payment: any) {
    return this.createKafkaEvent('payment.success', {
      paymentId: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
    });
  }
}
