/**
 * Post Mock Factory
 * 
 * 生成測試用的貼文數據
 */

export interface MockPost {
  id?: string;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  isPremium: boolean;
  price?: number;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

let postCounter = 0;

export class PostFactory {
  /**
   * 創建基本貼文
   */
  static create(overrides?: Partial<MockPost>): MockPost {
    postCounter++;
    
    return {
      id: `post-${postCounter}`,
      authorId: 'user-1',
      content: `Test post content ${postCounter}`,
      mediaUrls: [],
      isPremium: false,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  /**
   * 創建免費貼文
   */
  static createFree(overrides?: Partial<MockPost>): MockPost {
    return this.create({
      isPremium: false,
      ...overrides,
    });
  }
  
  /**
   * 創建付費貼文
   */
  static createPremium(price: number = 100, overrides?: Partial<MockPost>): MockPost {
    return this.create({
      isPremium: true,
      price,
      ...overrides,
    });
  }
  
  /**
   * 創建帶圖片的貼文
   */
  static createWithImages(imageCount: number = 3, overrides?: Partial<MockPost>): MockPost {
    return this.create({
      mediaUrls: Array.from(
        { length: imageCount },
        (_, i) => `https://example.com/image-${postCounter}-${i}.jpg`
      ),
      ...overrides,
    });
  }
  
  /**
   * 批量創建貼文
   */
  static createMany(count: number, overrides?: Partial<MockPost>): MockPost[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * 重置計數器
   */
  static reset(): void {
    postCounter = 0;
  }
}
