import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// 配置
export const SEED_CONFIG = {
  // 用戶數量
  USERS: {
    TOTAL: 100,
    SUGAR_BABIES: 60,
    SUGAR_DADDIES: 40,
  },
  // 創作者比例
  CREATORS_RATIO: 0.3, // 30% 用戶是創作者
  
  // 貼文數量
  POSTS: {
    MIN_PER_CREATOR: 5,
    MAX_PER_CREATOR: 30,
  },
  
  // 訂閱
  SUBSCRIPTIONS: {
    MIN_PER_USER: 0,
    MAX_PER_USER: 5,
  },
  
  // 互動
  INTERACTIONS: {
    LIKES_PER_POST: { MIN: 0, MAX: 100 },
    COMMENTS_PER_POST: { MIN: 0, MAX: 20 },
    SWIPES_PER_USER: { MIN: 10, MAX: 100 },
  },
  
  // 交易
  TRANSACTIONS: {
    MIN_PER_USER: 0,
    MAX_PER_USER: 20,
  },
};

// 預設密碼（所有測試帳號使用相同密碼）
export const DEFAULT_PASSWORD = 'Test1234!';

// 常見的城市（集中在台灣，少數國際城市）
export const CITIES = [
  // 台灣主要城市（佔 70% 用戶）
  { name: 'Taipei', country: 'Taiwan', lat: 25.0330, lng: 121.5654, weight: 25 },
  { name: 'New Taipei', country: 'Taiwan', lat: 25.0120, lng: 121.4657, weight: 15 },
  { name: 'Kaohsiung', country: 'Taiwan', lat: 22.6273, lng: 120.3014, weight: 10 },
  { name: 'Taichung', country: 'Taiwan', lat: 24.1477, lng: 120.6736, weight: 10 },
  { name: 'Tainan', country: 'Taiwan', lat: 22.9998, lng: 120.2270, weight: 5 },
  { name: 'Hsinchu', country: 'Taiwan', lat: 24.8038, lng: 120.9675, weight: 3 },
  { name: 'Taoyuan', country: 'Taiwan', lat: 24.9936, lng: 121.3010, weight: 2 },
  // 國際城市（佔 30% 用戶）
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, weight: 8 },
  { name: 'Hong Kong', country: 'Hong Kong', lat: 22.3193, lng: 114.1694, weight: 7 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, weight: 5 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, weight: 5 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018, weight: 5 },
];

// DM 價格選項
export const DM_PRICES = [0, 5, 10, 20, 50, 100, 200];

// 訂閱方案
export const SUBSCRIPTION_TIERS = [
  { name: 'Basic', price: 9.99, description: 'Basic access to content' },
  { name: 'Premium', price: 29.99, description: 'Premium content & direct messaging' },
  { name: 'VIP', price: 99.99, description: 'Exclusive VIP experience' },
];

// 技能標籤
export const SKILLS = [
  'Photography', 'Modeling', 'Fashion', 'Travel', 'Fitness',
  'Cooking', 'Music', 'Art', 'Dancing', 'Writing',
  'Business', 'Investing', 'Technology', 'Gaming', 'Languages',
];

// 興趣標籤（用於 interest_tags + user_interest_tags 表）
export const INTEREST_TAGS: { name: string; nameZh: string; category: string; icon: string }[] = [
  // lifestyle（生活方式）
  { name: 'travel', nameZh: '旅行', category: 'lifestyle', icon: '✈️' },
  { name: 'food', nameZh: '美食', category: 'lifestyle', icon: '🍣' },
  { name: 'fitness', nameZh: '健身', category: 'lifestyle', icon: '💪' },
  { name: 'shopping', nameZh: '購物', category: 'lifestyle', icon: '🛍️' },
  { name: 'party', nameZh: '派對', category: 'lifestyle', icon: '🎉' },
  { name: 'outdoor', nameZh: '戶外運動', category: 'lifestyle', icon: '🏕️' },
  { name: 'pets', nameZh: '寵物', category: 'lifestyle', icon: '🐾' },
  { name: 'yoga', nameZh: '瑜伽', category: 'lifestyle', icon: '🧘' },
  // interests（興趣愛好）
  { name: 'music', nameZh: '音樂', category: 'interests', icon: '🎵' },
  { name: 'movies', nameZh: '電影', category: 'interests', icon: '🎬' },
  { name: 'art', nameZh: '藝術', category: 'interests', icon: '🎨' },
  { name: 'photography', nameZh: '攝影', category: 'interests', icon: '📸' },
  { name: 'reading', nameZh: '閱讀', category: 'interests', icon: '📚' },
  { name: 'gaming', nameZh: '遊戲', category: 'interests', icon: '🎮' },
  { name: 'cooking', nameZh: '烹飪', category: 'interests', icon: '👨‍🍳' },
  { name: 'tech', nameZh: '科技', category: 'interests', icon: '💻' },
  // expectations（期望）
  { name: 'long_term', nameZh: '長期關係', category: 'expectations', icon: '💍' },
  { name: 'casual', nameZh: '短期約會', category: 'expectations', icon: '🥂' },
  { name: 'travel_companion', nameZh: '旅伴', category: 'expectations', icon: '🌍' },
  { name: 'mentor', nameZh: '導師', category: 'expectations', icon: '🎓' },
  { name: 'sponsor', nameZh: '生活贊助', category: 'expectations', icon: '💎' },
  // personality（性格特質）
  { name: 'introvert', nameZh: '內向', category: 'personality', icon: '🌙' },
  { name: 'extrovert', nameZh: '外向', category: 'personality', icon: '☀️' },
  { name: 'adventurous', nameZh: '冒險型', category: 'personality', icon: '🏔️' },
  { name: 'artistic', nameZh: '文藝型', category: 'personality', icon: '🎭' },
  { name: 'business', nameZh: '商務型', category: 'personality', icon: '💼' },
];

// 按權重隨機選擇城市
export function weightedPickCity(): typeof CITIES[number] {
  const totalWeight = CITIES.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const city of CITIES) {
    rand -= city.weight;
    if (rand <= 0) return city;
  }
  return CITIES[0];
}

// Sugar Baby 頭像
export const SUGAR_BABY_AVATARS = [
  'https://i.pravatar.cc/300?img=1',
  'https://i.pravatar.cc/300?img=5',
  'https://i.pravatar.cc/300?img=9',
  'https://i.pravatar.cc/300?img=12',
  'https://i.pravatar.cc/300?img=15',
  'https://i.pravatar.cc/300?img=20',
  'https://i.pravatar.cc/300?img=24',
  'https://i.pravatar.cc/300?img=28',
  'https://i.pravatar.cc/300?img=32',
  'https://i.pravatar.cc/300?img=36',
];

// Sugar Daddy 頭像
export const SUGAR_DADDY_AVATARS = [
  'https://i.pravatar.cc/300?img=3',
  'https://i.pravatar.cc/300?img=8',
  'https://i.pravatar.cc/300?img=11',
  'https://i.pravatar.cc/300?img=14',
  'https://i.pravatar.cc/300?img=19',
  'https://i.pravatar.cc/300?img=23',
  'https://i.pravatar.cc/300?img=27',
  'https://i.pravatar.cc/300?img=31',
  'https://i.pravatar.cc/300?img=35',
  'https://i.pravatar.cc/300?img=39',
];

// 輔助函數
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function generateUUID(): string {
  return uuidv4();
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, decimals: number = 2): number {
  const num = Math.random() * (max - min) + min;
  return parseFloat(num.toFixed(decimals));
}

export function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomPickMany<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function generateBio(userType: 'sugar_baby' | 'sugar_daddy'): string {
  if (userType === 'sugar_baby') {
    const templates = [
      `Hi! I'm ${faker.person.firstName()}, a ${faker.number.int({ min: 20, max: 28 })}-year-old ${faker.person.jobTitle()}. I love ${faker.word.noun()}, ${faker.word.noun()}, and ${faker.word.noun()}. Looking for someone special to share amazing experiences with! 💕`,
      `Passionate about life, travel, and making memories. I'm a student studying ${faker.person.jobArea()}. Always up for new adventures! ✈️`,
      `Fashion enthusiast 🛍️ | Foodie 🍣 | Travel lover 🌍 | DM me for exclusive content!`,
      `Just a girl trying to make it in the big city. Love photography, art galleries, and fine dining. Let's connect! 📸`,
      `Fitness junkie 💪 | Yoga instructor 🧘‍♀️ | Health coach 🥗 | Check out my workout routines!`,
    ];
    return randomPick(templates);
  } else {
    const templates = [
      `Successful entrepreneur in ${faker.person.jobArea()}. I appreciate beauty, intelligence, and ambition. Let's create something special together.`,
      `Executive looking for companionship and meaningful connections. I enjoy fine dining, travel, and supporting those I care about.`,
      `Investor | Mentor | Philanthropist 💼 | I believe in empowering others and sharing success. Subscribe for exclusive business insights.`,
      `World traveler 🌍 | Wine connoisseur 🍷 | Art collector 🎨 | Looking for someone to share life's pleasures with.`,
      `Tech executive with a passion for innovation. Love deep conversations, networking events, and helping others grow. 🚀`,
    ];
    return randomPick(templates);
  }
}
