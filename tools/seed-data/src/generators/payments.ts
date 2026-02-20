import { faker } from '@faker-js/faker';
import { SEED_CONFIG, SUBSCRIPTION_TIERS, generateUUID, randomInt, randomPick, randomFloat } from '../config';
import { UserData } from './users';

export interface SubscriptionTierData {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  benefits: string[];
  createdAt: Date;
}

export interface SubscriptionData {
  id: string;
  userId: string;
  creatorId: string;
  tierId: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startDate: Date;
  endDate: Date;
  amount: number;
  currency: string;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionData {
  id: string;
  userId: string;
  type: 'subscription' | 'tip' | 'post_purchase' | 'dm_purchase' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider: 'stripe' | 'paypal';
  providerId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  processedAt: Date | null;
}

export interface TipData {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  message: string | null;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export interface DMPurchaseData {
  id: string;
  userId: string;
  creatorId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  expiresAt: Date;
}

export interface PostPurchaseData {
  id: string;
  userId: string;
  postId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

// 打賞留言模板
const TIP_MESSAGES = [
  'Amazing content! 🔥',
  'Keep up the great work! 💪',
  'You deserve this! 🌟',
  'Coffee on me ☕️',
  'For your next photoshoot! 📸',
  'Love your energy! ✨',
  'Supporting my favorite creator! 💕',
  'This made my day! Thank you! 🙏',
  null, // 有時候不打留言
  null,
];

export class PaymentSeeder {
  private subscriptionTiers: SubscriptionTierData[] = [];
  private subscriptions: SubscriptionData[] = [];
  private transactions: TransactionData[] = [];
  private tips: TipData[] = [];
  private dmPurchases: DMPurchaseData[] = [];
  private postPurchases: PostPurchaseData[] = [];

  generateSubscriptionTiers(creators: UserData[]): SubscriptionTierData[] {
    console.log('💎 生成訂閱方案...');
    
    const tiers: SubscriptionTierData[] = [];
    
    for (const creator of creators) {
      // 每個創作者生成 1-3 個訂閱方案
      const numTiers = randomInt(1, 3);
      const selectedTiers = SUBSCRIPTION_TIERS.slice(0, numTiers);
      
      for (const tier of selectedTiers) {
        tiers.push({
          id: generateUUID(),
          creatorId: creator.id,
          name: tier.name,
          description: tier.description,
          price: tier.price,
          currency: 'USD',
          durationDays: 30,
          benefits: [
            `Access to ${tier.name} content`,
            'Direct messaging',
            'Exclusive photos & videos',
            tier.name === 'VIP' ? 'Monthly video call' : null,
            tier.name === 'VIP' ? 'Custom content requests' : null,
          ].filter(Boolean) as string[],
          createdAt: faker.date.past({ years: 1 }),
        });
      }
    }

    this.subscriptionTiers = tiers;
    console.log(`   ✓ 生成 ${tiers.length} 個訂閱方案`);
    return tiers;
  }

  generateSubscriptions(
    subscribers: UserData[],
    creators: UserData[],
    tiers: SubscriptionTierData[]
  ): SubscriptionData[] {
    console.log('📅 生成訂閱記錄...');
    
    const subscriptions: SubscriptionData[] = [];
    
    for (const subscriber of subscribers) {
      // 每個訂閱者隨機訂閱 0-5 個創作者
      const numSubscriptions = randomInt(
        SEED_CONFIG.SUBSCRIPTIONS.MIN_PER_USER,
        SEED_CONFIG.SUBSCRIPTIONS.MAX_PER_USER
      );
      
      // 隨機選擇創作者
      const selectedCreators = creators
        .sort(() => 0.5 - Math.random())
        .slice(0, numSubscriptions);
      
      for (const creator of selectedCreators) {
        // 找到該創作者的訂閱方案
        const creatorTiers = tiers.filter(t => t.creatorId === creator.id);
        if (creatorTiers.length === 0) continue;
        
        const tier = randomPick(creatorTiers);
        const startDate = faker.date.past({ years: 1 });
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);
        
        // 決定狀態
        const status = randomPick(['active', 'active', 'active', 'cancelled', 'expired'] as const);
        
        subscriptions.push({
          id: generateUUID(),
          userId: subscriber.id,
          creatorId: creator.id,
          tierId: tier.id,
          status,
          startDate,
          endDate,
          amount: tier.price,
          currency: 'USD',
          autoRenew: status === 'active' ? Math.random() > 0.3 : false,
          createdAt: startDate,
          updatedAt: faker.date.recent({ days: 7 }),
        });
      }
    }

    this.subscriptions = subscriptions;
    console.log(`   ✓ 生成 ${subscriptions.length} 個訂閱`);
    console.log(`     - 活躍: ${subscriptions.filter(s => s.status === 'active').length}`);
    console.log(`     - 已取消: ${subscriptions.filter(s => s.status === 'cancelled').length}`);
    console.log(`     - 已過期: ${subscriptions.filter(s => s.status === 'expired').length}`);
    
    return subscriptions;
  }

  generateTransactions(users: UserData[], subscriptions: SubscriptionData[]): TransactionData[] {
    console.log('💳 生成交易記錄...');
    
    const transactions: TransactionData[] = [];
    
    // 為每個訂閱生成交易記錄
    for (const subscription of subscriptions) {
      transactions.push({
        id: generateUUID(),
        userId: subscription.userId,
        type: 'subscription',
        amount: subscription.amount,
        currency: subscription.currency,
        status: subscription.status === 'active' ? 'completed' : randomPick(['completed', 'completed', 'failed']),
        provider: 'stripe',
        providerId: `pi_${faker.string.alphanumeric(24)}`,
        metadata: {
          subscriptionId: subscription.id,
          creatorId: subscription.creatorId,
        },
        createdAt: subscription.createdAt,
        processedAt: subscription.createdAt,
      });
    }
    
    // 為每個用戶生成額外的隨機交易
    for (const user of users) {
      const numTransactions = randomInt(
        SEED_CONFIG.TRANSACTIONS.MIN_PER_USER,
        SEED_CONFIG.TRANSACTIONS.MAX_PER_USER
      );
      
      for (let i = 0; i < numTransactions; i++) {
        const type = randomPick(['tip', 'dm_purchase', 'post_purchase'] as const);
        const amount = type === 'tip' 
          ? randomPick([5, 10, 20, 50, 100])
          : randomFloat(5, 30);
        
        const createdAt = faker.date.past({ years: 1 });
        
        transactions.push({
          id: generateUUID(),
          userId: user.id,
          type,
          amount,
          currency: 'USD',
          status: randomPick(['completed', 'completed', 'completed', 'pending', 'failed']),
          provider: 'stripe',
          providerId: `pi_${faker.string.alphanumeric(24)}`,
          metadata: {},
          createdAt,
          processedAt: Math.random() > 0.2 ? createdAt : null,
        });
      }
    }

    this.transactions = transactions;
    console.log(`   ✓ 生成 ${transactions.length} 筆交易`);
    console.log(`     - 訂閱: ${transactions.filter(t => t.type === 'subscription').length}`);
    console.log(`     - 打賞: ${transactions.filter(t => t.type === 'tip').length}`);
    console.log(`     - 內容購買: ${transactions.filter(t => t.type === 'post_purchase').length}`);
    
    return transactions;
  }

  generateTips(users: UserData[], creators: UserData[]): TipData[] {
    console.log('🎁 生成打賞記錄...');
    
    const tips: TipData[] = [];
    
    for (const user of users) {
      // 隨機生成打賞（不是每個用戶都打賞）
      if (Math.random() < 0.3) { // 30% 的用戶有打賞
        const numTips = randomInt(1, 5);
        
        for (let i = 0; i < numTips; i++) {
          const creator = randomPick(creators);
          if (creator.id !== user.id) {
            tips.push({
              id: generateUUID(),
              fromUserId: user.id,
              toUserId: creator.id,
              amount: randomPick([5, 10, 20, 50, 100]),
              currency: 'USD',
              message: randomPick(TIP_MESSAGES),
              status: 'completed',
              createdAt: faker.date.past({ years: 1 }),
            });
          }
        }
      }
    }

    this.tips = tips;
    console.log(`   ✓ 生成 ${tips.length} 筆打賞`);
    return tips;
  }

  generateDMPurchases(subscribers: UserData[], creators: UserData[]): DMPurchaseData[] {
    console.log('💬 生成 DM 購買記錄...');
    
    const purchases: DMPurchaseData[] = [];
    const usedPairs = new Set<string>();
    
    for (const subscriber of subscribers) {
      // 有付費 DM 的創作者
      const paidCreators = creators.filter(c => c.dmPrice && c.dmPrice > 0);
      
      // 隨機購買 DM
      if (Math.random() < 0.2 && paidCreators.length > 0) { // 20% 的用戶購買過 DM
        const numPurchases = randomInt(1, 3);
        let count = 0;
        
        // 隨機打亂創作者順序
        const shuffledCreators = [...paidCreators].sort(() => 0.5 - Math.random());
        
        for (const creator of shuffledCreators) {
          if (count >= numPurchases) break;
          
          const pairKey = `${subscriber.id}-${creator.id}`;
          if (usedPairs.has(pairKey)) continue;
          
          usedPairs.add(pairKey);
          const createdAt = faker.date.past({ years: 1 });
          const expiresAt = new Date(createdAt);
          expiresAt.setDate(expiresAt.getDate() + 30); // 30 天有效期
          
          purchases.push({
            id: generateUUID(),
            userId: subscriber.id,
            creatorId: creator.id,
            amount: creator.dmPrice!,
            currency: 'USD',
            status: 'completed',
            createdAt,
            expiresAt,
          });
          count++;
        }
      }
    }

    this.dmPurchases = purchases;
    console.log(`   ✓ 生成 ${purchases.length} 個 DM 購買`);
    return purchases;
  }

  getSubscriptionTiers(): SubscriptionTierData[] {
    return this.subscriptionTiers;
  }

  getSubscriptions(): SubscriptionData[] {
    return this.subscriptions;
  }

  getTransactions(): TransactionData[] {
    return this.transactions;
  }

  getTips(): TipData[] {
    return this.tips;
  }

  getDMPurchases(): DMPurchaseData[] {
    return this.dmPurchases;
  }
}
