import { faker } from '@faker-js/faker';
import {
  SEED_CONFIG,
  CITIES,
  DM_PRICES,
  SKILLS,
  SUGAR_BABY_AVATARS,
  SUGAR_DADDY_AVATARS,
  generateUUID,
  randomInt,
  randomPick,
  randomPickMany,
  generateBio,
  hashPassword,
  DEFAULT_PASSWORD,
} from '../config';

export interface UserData {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  userType: 'sugar_baby' | 'sugar_daddy';
  permissionRole: 'subscriber' | 'creator' | 'admin';
  bio: string;
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  locationUpdatedAt: Date | null;
  dmPrice: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillData {
  id: string;
  category: string;
  name: string;
  nameEn: string;
  nameZhTw: string;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSkillData {
  id: string;
  userId: string;
  skillId: string;
  proficiencyLevel: number;
  createdAt: Date;
}

export class UserSeeder {
  private users: UserData[] = [];
  private skills: SkillData[] = [];
  private userSkills: UserSkillData[] = [];
  private passwordHash: string;

  constructor() {
    // 預先計算密碼哈希
    this.passwordHash = '';
  }

  async initialize(): Promise<void> {
    this.passwordHash = await hashPassword(DEFAULT_PASSWORD);
  }

  generateSkills(): SkillData[] {
    console.log('🔧 生成技能標籤...');
    
    const skillDefinitions = [
      { name: 'Photography', nameEn: 'Photography', nameZhTw: '攝影', category: 'talent' },
      { name: 'Modeling', nameEn: 'Modeling', nameZhTw: '模特', category: 'talent' },
      { name: 'Fashion', nameEn: 'Fashion', nameZhTw: '時尚', category: 'lifestyle' },
      { name: 'Travel', nameEn: 'Travel', nameZhTw: '旅行', category: 'lifestyle' },
      { name: 'Fitness', nameEn: 'Fitness', nameZhTw: '健身', category: 'lifestyle' },
      { name: 'Cooking', nameEn: 'Cooking', nameZhTw: '烹飪', category: 'hobby' },
      { name: 'Music', nameEn: 'Music', nameZhTw: '音樂', category: 'talent' },
      { name: 'Art', nameEn: 'Art', nameZhTw: '藝術', category: 'talent' },
      { name: 'Dancing', nameEn: 'Dancing', nameZhTw: '舞蹈', category: 'talent' },
      { name: 'Writing', nameEn: 'Writing', nameZhTw: '寫作', category: 'talent' },
      { name: 'Business', nameEn: 'Business', nameZhTw: '商業', category: 'profession' },
      { name: 'Investing', nameEn: 'Investing', nameZhTw: '投資', category: 'profession' },
      { name: 'Technology', nameEn: 'Technology', nameZhTw: '科技', category: 'profession' },
      { name: 'Gaming', nameEn: 'Gaming', nameZhTw: '遊戲', category: 'hobby' },
      { name: 'Languages', nameEn: 'Languages', nameZhTw: '語言', category: 'language' },
    ];
    
    this.skills = skillDefinitions.map((skill, index) => ({
      id: generateUUID(),
      category: skill.category,
      name: skill.name,
      nameEn: skill.nameEn,
      nameZhTw: skill.nameZhTw,
      icon: null,
      isActive: true,
      sortOrder: index,
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: new Date(),
    }));

    console.log(`   ✓ 生成 ${this.skills.length} 個技能標籤`);
    return this.skills;
  }

  generateUsers(): UserData[] {
    console.log('👥 生成用戶...');
    
    const users: UserData[] = [];
    
    // 生成 Sugar Babies
    for (let i = 0; i < SEED_CONFIG.USERS.SUGAR_BABIES; i++) {
      const isCreator = Math.random() < SEED_CONFIG.CREATORS_RATIO;
      const location = randomPick(CITIES);
      
      users.push({
        id: generateUUID(),
        email: `baby${i + 1}@test.com`,
        passwordHash: this.passwordHash,
        displayName: `${faker.person.firstName('female')} ${faker.person.lastName().slice(0, 1)}.`,
        userType: 'sugar_baby',
        permissionRole: isCreator ? 'creator' : 'subscriber',
        bio: generateBio('sugar_baby'),
        avatarUrl: randomPick(SUGAR_BABY_AVATARS),
        latitude: location.lat + randomFloat(-0.1, 0.1),
        longitude: location.lng + randomFloat(-0.1, 0.1),
        city: location.name,
        country: location.country,
        locationUpdatedAt: faker.date.recent({ days: 30 }),
        dmPrice: isCreator ? randomPick(DM_PRICES) : null,
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent({ days: 7 }),
      });
    }

    // 生成 Sugar Daddies
    for (let i = 0; i < SEED_CONFIG.USERS.SUGAR_DADDIES; i++) {
      const isCreator = Math.random() < SEED_CONFIG.CREATORS_RATIO;
      const location = randomPick(CITIES);
      
      users.push({
        id: generateUUID(),
        email: `daddy${i + 1}@test.com`,
        passwordHash: this.passwordHash,
        displayName: `${faker.person.firstName('male')} ${faker.person.lastName().slice(0, 1)}.`,
        userType: 'sugar_daddy',
        permissionRole: isCreator ? 'creator' : 'subscriber',
        bio: generateBio('sugar_daddy'),
        avatarUrl: randomPick(SUGAR_DADDY_AVATARS),
        latitude: location.lat + randomFloat(-0.1, 0.1),
        longitude: location.lng + randomFloat(-0.1, 0.1),
        city: location.name,
        country: location.country,
        locationUpdatedAt: faker.date.recent({ days: 30 }),
        dmPrice: isCreator ? randomPick(DM_PRICES) : null,
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent({ days: 7 }),
      });
    }

    // 添加特殊測試帳號
    users.unshift(
      {
        id: generateUUID(),
        email: 'admin@suggar-daddy.com',
        passwordHash: this.passwordHash,
        displayName: 'System Admin',
        userType: 'sugar_daddy',
        permissionRole: 'admin',
        bio: 'Platform administrator',
        avatarUrl: 'https://i.pravatar.cc/300?img=60',
        latitude: null,
        longitude: null,
        city: null,
        country: null,
        locationUpdatedAt: null,
        dmPrice: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: generateUUID(),
        email: 'creator1@test.com',
        passwordHash: this.passwordHash,
        displayName: 'Premium Creator 🌟',
        userType: 'sugar_baby',
        permissionRole: 'creator',
        bio: 'Top creator with exclusive content! Subscribe for daily updates 💕',
        avatarUrl: 'https://i.pravatar.cc/300?img=10',
        latitude: 25.0330,
        longitude: 121.5654,
        city: 'Taipei',
        country: 'Taiwan',
        locationUpdatedAt: new Date(),
        dmPrice: 50,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(),
      },
      {
        id: generateUUID(),
        email: 'subscriber1@test.com',
        passwordHash: this.passwordHash,
        displayName: 'Loyal Subscriber',
        userType: 'sugar_daddy',
        permissionRole: 'subscriber',
        bio: 'Love supporting amazing creators! 🎉',
        avatarUrl: 'https://i.pravatar.cc/300?img=15',
        latitude: 35.6762,
        longitude: 139.6503,
        city: 'Tokyo',
        country: 'Japan',
        locationUpdatedAt: new Date(),
        dmPrice: null,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date(),
      }
    );

    this.users = users;
    console.log(`   ✓ 生成 ${users.length} 個用戶`);
    console.log(`     - Sugar Babies: ${users.filter(u => u.userType === 'sugar_baby').length}`);
    console.log(`     - Sugar Daddies: ${users.filter(u => u.userType === 'sugar_daddy').length}`);
    console.log(`     - Creators: ${users.filter(u => u.permissionRole === 'creator').length}`);
    
    return users;
  }

  generateUserSkills(): UserSkillData[] {
    console.log('🎯 分配用戶技能...');
    
    const userSkills: UserSkillData[] = [];
    
    for (const user of this.users) {
      // 每個用戶隨機分配 2-5 個技能
      const numSkills = randomInt(2, 5);
      const selectedSkills = randomPickMany(this.skills, numSkills);
      
      for (const skill of selectedSkills) {
        userSkills.push({
          id: generateUUID(),
          userId: user.id,
          skillId: skill.id,
          proficiencyLevel: randomInt(1, 5), // 1-5 級
          createdAt: faker.date.past({ years: 1 }),
        });
      }
    }

    this.userSkills = userSkills;
    console.log(`   ✓ 分配 ${userSkills.length} 個用戶技能關聯`);
    return userSkills;
  }

  getUsers(): UserData[] {
    return this.users;
  }

  getCreators(): UserData[] {
    return this.users.filter(u => u.permissionRole === 'creator');
  }

  getSubscribers(): UserData[] {
    return this.users.filter(u => u.permissionRole === 'subscriber');
  }

  getSkills(): SkillData[] {
    return this.skills;
  }

  getUserSkills(): UserSkillData[] {
    return this.userSkills;
  }
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
