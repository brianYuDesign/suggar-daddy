/**
 * User Mock Factory
 * 
 * 生成測試用的用戶數據
 */

export interface MockUser {
  id?: string;
  email: string;
  password?: string;
  displayName: string;
  userType: 'sugar_daddy' | 'sugar_baby' | 'creator';
  permissionRole: 'admin' | 'user';
  bio?: string;
  avatarUrl?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

let userCounter = 0;

export class UserFactory {
  /**
   * 創建基本用戶
   */
  static create(overrides?: Partial<MockUser>): MockUser {
    userCounter++;
    
    return {
      id: `user-${userCounter}`,
      email: `test${userCounter}@example.com`,
      password: 'Test123456!',
      displayName: `Test User ${userCounter}`,
      userType: 'sugar_daddy',
      permissionRole: 'user',
      bio: 'Test bio',
      avatarUrl: 'https://example.com/avatar.jpg',
      verificationStatus: 'verified',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  /**
   * 創建 Sugar Daddy
   */
  static createSugarDaddy(overrides?: Partial<MockUser>): MockUser {
    return this.create({
      userType: 'sugar_daddy',
      displayName: `Sugar Daddy ${userCounter + 1}`,
      ...overrides,
    });
  }
  
  /**
   * 創建 Sugar Baby
   */
  static createSugarBaby(overrides?: Partial<MockUser>): MockUser {
    return this.create({
      userType: 'sugar_baby',
      displayName: `Sugar Baby ${userCounter + 1}`,
      ...overrides,
    });
  }
  
  /**
   * 創建創作者
   */
  static createCreator(overrides?: Partial<MockUser>): MockUser {
    return this.create({
      userType: 'creator',
      displayName: `Creator ${userCounter + 1}`,
      ...overrides,
    });
  }
  
  /**
   * 創建管理員
   */
  static createAdmin(overrides?: Partial<MockUser>): MockUser {
    return this.create({
      permissionRole: 'admin',
      displayName: `Admin ${userCounter + 1}`,
      ...overrides,
    });
  }
  
  /**
   * 批量創建用戶
   */
  static createMany(count: number, overrides?: Partial<MockUser>): MockUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * 重置計數器
   */
  static reset(): void {
    userCounter = 0;
  }
}
