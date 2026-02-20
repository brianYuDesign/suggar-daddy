import { faker } from '@faker-js/faker';
import { SEED_CONFIG, generateUUID, randomInt, randomPick, randomFloat } from '../config';
import { UserData } from './users';

export interface PostData {
  id: string;
  creatorId: string;
  contentType: 'text' | 'image' | 'video' | 'mixed';
  caption: string;
  mediaUrls: string[];
  visibility: 'public' | 'subscribers' | 'premium';
  requiredTierId: string | null;
  ppvPrice: number | null;
  likeCount: number;
  commentCount: number;
  videoMeta: Record<string, unknown> | null;
  createdAt: Date;
}

export interface StoryData {
  id: string;
  creatorId: string;
  contentType: 'image' | 'video';
  mediaUrl: string;
  caption: string | null;
  viewCount: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface PostLikeData {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface PostCommentData {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface BookmarkData {
  id: string;
  userId: string;
  postId: string;
  createdAt: Date;
}

// 貼文內容模板
const POST_TEMPLATES = {
  text: [
    'Just had the most amazing day! 🌟✨ What did you all do today?',
    'Feeling grateful for all my supporters! 💕 You guys are the best!',
    'New content dropping soon! Stay tuned 👀🔥',
    'Sunday vibes ☕️📖 Taking it slow today',
    'Behind the scenes of my latest shoot 🎬',
    'Thank you for {count} followers! 🎉 Here\'s to more!',
    'Monday motivation 💪 Let\'s crush this week!',
    'Travel diary: {location} was absolutely magical ✈️🌍',
    'Self-care Sunday 🧖‍♀️✨ Remember to take care of yourself!',
    'Exclusive thoughts for my subscribers only 💭',
  ],
  image: [
    'New photoset just dropped! 📸✨ What do you think?',
    'Golden hour hits different 🌅💛',
    'Outfit of the day! 👗✨',
    'Living my best life 🥂✨',
    'Workout complete! 💪🔥',
    'Brunch vibes 🥑☕️',
    'Beach day essentials 🏖️👙',
    'City lights and late nights 🌃✨',
    'Cozy Sunday morning ☕️📚',
    'Glam session 💄✨',
  ],
  video: [
    'New video is up! 🎥 Check it out and let me know your thoughts!',
    'Day in my life vlog 🎬',
    'Tutorial: {topic} 💡',
    'Get ready with me ✨',
    'Q&A time! Ask me anything 💬',
    'Behind the scenes footage 🎬',
    'My morning routine ☀️',
    'Cooking with me 👩‍🍳',
    'Workout routine 💪',
    'Travel vlog: {location} 🌍',
  ],
  mixed: [
    'Photo dump! 📸 Swipe to see more ➡️',
    'This week\'s highlights ✨',
    'Collection of my favorite moments 💕',
    'Content overload incoming! 🚨',
    'Best of {month} 🏆',
  ],
};

// 評論模板
const COMMENT_TEMPLATES = [
  'Amazing content! 🔥',
  'You look stunning! 😍',
  'Love this! 💕',
  'So beautiful! ✨',
  'Can\'t wait for more! 👀',
  'This is gold! 🏆',
  'Absolutely gorgeous! 💎',
  'Made my day! ☀️',
  'Perfection! 👌',
  'Wow! Just wow! 🤩',
  'Subscribed immediately! 🔔',
  'Worth every penny! 💰',
  'Best creator ever! 🌟',
  'More please! 🙏',
  'Incredible! 🤯',
];

// 假圖片 URL
const FAKE_IMAGES = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
  'https://images.unsplash.com/photo-1499557354967-2b2d8910bcca?w=800',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
];

// 假影片縮圖
const FAKE_VIDEOS = [
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
  'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800',
];

export class ContentSeeder {
  private posts: PostData[] = [];
  private stories: StoryData[] = [];
  private postLikes: PostLikeData[] = [];
  private postComments: PostCommentData[] = [];
  private bookmarks: BookmarkData[] = [];

  generatePosts(creators: UserData[]): PostData[] {
    console.log('📝 生成貼文...');
    
    const posts: PostData[] = [];
    
    for (const creator of creators) {
      // 每個創作者生成 5-30 篇貼文
      const numPosts = randomInt(
        SEED_CONFIG.POSTS.MIN_PER_CREATOR,
        SEED_CONFIG.POSTS.MAX_PER_CREATOR
      );
      
      for (let i = 0; i < numPosts; i++) {
        const contentType = randomPick(['text', 'image', 'video', 'mixed'] as const);
        const visibility = randomPick(['public', 'subscribers', 'premium'] as const);
        
        // 根據可見性設置價格
        let ppvPrice: number | null = null;
        if (visibility === 'premium') {
          ppvPrice = randomPick([5, 10, 15, 20, 25, 30]);
        }
        
        const caption = this.generateCaption(contentType);
        const mediaUrls = this.generateMediaUrls(contentType);
        
        posts.push({
          id: generateUUID(),
          creatorId: creator.id,
          contentType,
          caption,
          mediaUrls,
          visibility,
          requiredTierId: null, // 可以根據需要設置
          ppvPrice,
          likeCount: 0, // 將在生成互動時更新
          commentCount: 0, // 將在生成互動時更新
          videoMeta: contentType === 'video' ? {
            duration: randomInt(30, 600),
            resolution: randomPick(['720p', '1080p', '4K']),
          } : null,
          createdAt: faker.date.past({ years: 1 }),
        });
      }
    }

    this.posts = posts;
    console.log(`   ✓ 生成 ${posts.length} 篇貼文`);
    console.log(`     - 公開: ${posts.filter(p => p.visibility === 'public').length}`);
    console.log(`     - 訂閱者: ${posts.filter(p => p.visibility === 'subscribers').length}`);
    console.log(`     - 付費: ${posts.filter(p => p.visibility === 'premium').length}`);
    
    return posts;
  }

  generateStories(creators: UserData[]): StoryData[] {
    console.log('📱 生成限時動態...');
    
    const stories: StoryData[] = [];
    
    for (const creator of creators) {
      // 每個創作者生成 0-10 個限時動態
      const numStories = randomInt(0, 10);
      
      for (let i = 0; i < numStories; i++) {
        const createdAt = faker.date.recent({ days: 1 });
        const expiresAt = new Date(createdAt);
        expiresAt.setHours(expiresAt.getHours() + 24); // 24小時後過期
        
        stories.push({
          id: generateUUID(),
          creatorId: creator.id,
          contentType: randomPick(['image', 'video']),
          mediaUrl: randomPick(FAKE_IMAGES),
          caption: randomPick([null, 'Swipe up! 👆', 'Link in bio 🔗', '24h only ⏰']),
          viewCount: randomInt(0, 500),
          expiresAt,
          createdAt,
        });
      }
    }

    this.stories = stories;
    console.log(`   ✓ 生成 ${stories.length} 個限時動態`);
    return stories;
  }

  generateInteractions(users: UserData[]): { likes: PostLikeData[], comments: PostCommentData[], bookmarks: BookmarkData[] } {
    console.log('💝 生成互動數據...');
    
    const likes: PostLikeData[] = [];
    const comments: PostCommentData[] = [];
    const bookmarks: BookmarkData[] = [];
    
    // 為每篇貼文生成互動
    for (const post of this.posts) {
      // 生成讚
      const numLikes = randomInt(
        SEED_CONFIG.INTERACTIONS.LIKES_PER_POST.MIN,
        SEED_CONFIG.INTERACTIONS.LIKES_PER_POST.MAX
      );
      
      const likedUsers = new Set<string>();
      for (let i = 0; i < numLikes && likedUsers.size < users.length; i++) {
        const user = randomPick(users);
        if (!likedUsers.has(user.id) && user.id !== post.creatorId) {
          likedUsers.add(user.id);
          likes.push({
            id: generateUUID(),
            postId: post.id,
            userId: user.id,
            createdAt: faker.date.between({ from: post.createdAt, to: new Date() }),
          });
        }
      }
      
      // 生成評論
      const numComments = randomInt(
        SEED_CONFIG.INTERACTIONS.COMMENTS_PER_POST.MIN,
        SEED_CONFIG.INTERACTIONS.COMMENTS_PER_POST.MAX
      );
      
      const commentedUsers = new Set<string>();
      for (let i = 0; i < numComments && commentedUsers.size < users.length; i++) {
        const user = randomPick(users);
        if (!commentedUsers.has(user.id) && user.id !== post.creatorId) {
          commentedUsers.add(user.id);
          comments.push({
            id: generateUUID(),
            postId: post.id,
            userId: user.id,
            content: randomPick(COMMENT_TEMPLATES),
            createdAt: faker.date.between({ from: post.createdAt, to: new Date() }),
          });
        }
      }
      
      // 生成收藏（較少）
      if (Math.random() < 0.3) { // 30% 的貼文有收藏
        const numBookmarks = randomInt(1, 10);
        const bookmarkedUsers = new Set<string>();
        
        for (let i = 0; i < numBookmarks && bookmarkedUsers.size < users.length; i++) {
          const user = randomPick(users);
          if (!bookmarkedUsers.has(user.id)) {
            bookmarkedUsers.add(user.id);
            bookmarks.push({
              id: generateUUID(),
              userId: user.id,
              postId: post.id,
              createdAt: faker.date.between({ from: post.createdAt, to: new Date() }),
            });
          }
        }
      }
    }

    this.postLikes = likes;
    this.postComments = comments;
    this.bookmarks = bookmarks;
    
    console.log(`   ✓ 生成 ${likes.length} 個讚`);
    console.log(`   ✓ 生成 ${comments.length} 條評論`);
    console.log(`   ✓ 生成 ${bookmarks.length} 個收藏`);
    
    return { likes, comments, bookmarks };
  }

  private generateCaption(contentType: 'text' | 'image' | 'video' | 'mixed'): string {
    const templates = POST_TEMPLATES[contentType];
    let caption = randomPick(templates);
    
    // 替換變量
    caption = caption
      .replace('{count}', String(randomInt(100, 10000)))
      .replace('{location}', faker.location.city())
      .replace('{month}', faker.date.month())
      .replace('{topic}', randomPick(['makeup', 'fitness', 'cooking', 'travel', 'fashion']));
    
    // 隨機添加表情符號
    if (Math.random() < 0.5) {
      caption += ' ' + randomPick(['✨', '💕', '🔥', '🌟', '💎', '🎉']);
    }
    
    return caption;
  }

  private generateMediaUrls(contentType: 'text' | 'image' | 'video' | 'mixed'): string[] {
    switch (contentType) {
      case 'text':
        return [];
      case 'image':
        return [randomPick(FAKE_IMAGES)];
      case 'video':
        return [randomPick(FAKE_VIDEOS)];
      case 'mixed':
        return [
          randomPick(FAKE_IMAGES),
          randomPick(FAKE_IMAGES),
          randomPick(FAKE_VIDEOS),
        ];
      default:
        return [];
    }
  }

  getPosts(): PostData[] {
    return this.posts;
  }

  getStories(): StoryData[] {
    return this.stories;
  }

  getPostLikes(): PostLikeData[] {
    return this.postLikes;
  }

  getPostComments(): PostCommentData[] {
    return this.postComments;
  }

  getBookmarks(): BookmarkData[] {
    return this.bookmarks;
  }
}
