/**
 * Transaction Mock Factory
 * 
 * 生成測試用的交易數據
 */

export interface MockTransaction {
  id?: string;
  userId: string;
  type: 'tip' | 'subscription' | 'post_purchase' | 'withdrawal';
  amount: number;
  currency?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

let transactionCounter = 0;

export class TransactionFactory {
  /**
   * 創建基本交易
   */
  static create(overrides?: Partial<MockTransaction>): MockTransaction {
    transactionCounter++;
    
    return {
      id: `txn-${transactionCounter}`,
      userId: 'user-1',
      type: 'tip',
      amount: 1000, // 10.00 in cents
      currency: 'USD',
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  /**
   * 創建打賞交易
   */
  static createTip(amount: number, overrides?: Partial<MockTransaction>): MockTransaction {
    return this.create({
      type: 'tip',
      amount,
      ...overrides,
    });
  }
  
  /**
   * 創建訂閱交易
   */
  static createSubscription(amount: number, overrides?: Partial<MockTransaction>): MockTransaction {
    return this.create({
      type: 'subscription',
      amount,
      ...overrides,
    });
  }
  
  /**
   * 創建貼文購買交易
   */
  static createPostPurchase(amount: number, postId: string, overrides?: Partial<MockTransaction>): MockTransaction {
    return this.create({
      type: 'post_purchase',
      amount,
      metadata: { postId },
      ...overrides,
    });
  }
  
  /**
   * 創建提現交易
   */
  static createWithdrawal(amount: number, overrides?: Partial<MockTransaction>): MockTransaction {
    return this.create({
      type: 'withdrawal',
      amount,
      ...overrides,
    });
  }
  
  /**
   * 創建待處理交易
   */
  static createPending(overrides?: Partial<MockTransaction>): MockTransaction {
    return this.create({
      status: 'pending',
      ...overrides,
    });
  }
  
  /**
   * 創建失敗交易
   */
  static createFailed(overrides?: Partial<MockTransaction>): MockTransaction {
    return this.create({
      status: 'failed',
      ...overrides,
    });
  }
  
  /**
   * 批量創建交易
   */
  static createMany(count: number, overrides?: Partial<MockTransaction>): MockTransaction[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * 重置計數器
   */
  static reset(): void {
    transactionCounter = 0;
  }
}
