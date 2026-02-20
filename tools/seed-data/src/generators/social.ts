import { faker } from '@faker-js/faker';
import { generateUUID, randomInt, randomPick } from '../config';
import { UserData } from './users';

export interface FollowData {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface SwipeData {
  id: string;
  userId: string;
  targetUserId: string;
  direction: 'left' | 'right';
  createdAt: Date;
}

export interface MatchData {
  id: string;
  user1Id: string;
  user2Id: string;
  matchedAt: Date;
  isActive: boolean;
}

export class SocialSeeder {
  private follows: FollowData[] = [];
  private swipes: SwipeData[] = [];
  private matches: MatchData[] = [];

  generateFollows(users: UserData[]): FollowData[] {
    console.log('👥 生成追蹤關係...');
    
    const follows: FollowData[] = [];
    
    for (const user of users) {
      // 每個用戶追蹤 5-50 個其他用戶
      const numFollowing = randomInt(5, 50);
      const potentialTargets = users.filter(u => u.id !== user.id);
      
      const selectedTargets = potentialTargets
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(numFollowing, potentialTargets.length));
      
      for (const target of selectedTargets) {
        follows.push({
          id: generateUUID(),
          followerId: user.id,
          followingId: target.id,
          createdAt: faker.date.past({ years: 1 }),
        });
      }
    }

    this.follows = follows;
    console.log(`   ✓ 生成 ${follows.length} 個追蹤關係`);
    
    // 統計
    const followCounts = new Map<string, number>();
    for (const follow of follows) {
      followCounts.set(follow.followingId, (followCounts.get(follow.followingId) || 0) + 1);
    }
    
    const maxFollowers = Math.max(...followCounts.values());
    console.log(`     - 最多追蹤者: ${maxFollowers} 人`);
    
    return follows;
  }

  generateSwipesAndMatches(users: UserData[]): { swipes: SwipeData[], matches: MatchData[] } {
    console.log('💘 生成配對數據...');
    
    const swipes: SwipeData[] = [];
    const matches: MatchData[] = [];
    
    // 只讓 sugar_daddy  swipe sugar_baby（根據平台定位）
    const sugarDaddies = users.filter(u => u.userType === 'sugar_daddy');
    const sugarBabies = users.filter(u => u.userType === 'sugar_baby');
    
    for (const daddy of sugarDaddies) {
      // 每個 daddy swipe 10-100 個 baby
      const numSwipes = randomInt(10, 100);
      const selectedBabies = sugarBabies
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(numSwipes, sugarBabies.length));
      
      // 記錄已經互相喜歡的配對
      const likedBabies: UserData[] = [];
      
      for (const baby of selectedBabies) {
        // 70% 機率向右滑（喜歡）
        const direction = Math.random() < 0.7 ? 'right' : 'left';
        
        swipes.push({
          id: generateUUID(),
          userId: daddy.id,
          targetUserId: baby.id,
          direction,
          createdAt: faker.date.past({ years: 1 }),
        });
        
        if (direction === 'right') {
          likedBabies.push(baby);
        }
      }
      
      // 檢查是否有配對（baby 也向右滑 daddy）
      for (const baby of likedBabies) {
        // 檢查 baby 是否已經 swipe 過這個 daddy
        const existingSwipe = swipes.find(
          s => s.userId === baby.id && s.targetUserId === daddy.id
        );
        
        if (existingSwipe) {
          // baby 已經 swipe 過
          if (existingSwipe.direction === 'right') {
            // 配對成功！
            matches.push({
              id: generateUUID(),
              user1Id: daddy.id,
              user2Id: baby.id,
              matchedAt: faker.date.between({ 
                from: existingSwipe.createdAt > swipes.find(s => s.userId === daddy.id && s.targetUserId === baby.id)!.createdAt 
                  ? existingSwipe.createdAt 
                  : swipes.find(s => s.userId === daddy.id && s.targetUserId === baby.id)!.createdAt,
                to: new Date() 
              }),
              isActive: Math.random() > 0.3, // 70% 的配對仍然活躍
            });
          }
        } else {
          // baby 還沒 swipe，隨機決定是否喜歡（30% 配對率）
          if (Math.random() < 0.3) {
            const babySwipeDate = faker.date.recent({ days: 30 });
            
            swipes.push({
              id: generateUUID(),
              userId: baby.id,
              targetUserId: daddy.id,
              direction: 'right',
              createdAt: babySwipeDate,
            });
            
            // 配對成功！
            const daddySwipe = swipes.find(s => s.userId === daddy.id && s.targetUserId === baby.id)!;
            const earlierDate = daddySwipe.createdAt < babySwipeDate ? daddySwipe.createdAt : babySwipeDate;
            matches.push({
              id: generateUUID(),
              user1Id: daddy.id,
              user2Id: baby.id,
              matchedAt: faker.date.between({ from: earlierDate, to: new Date() }),
              isActive: Math.random() > 0.3,
            });
          } else {
            // baby 不喜歡
            swipes.push({
              id: generateUUID(),
              userId: baby.id,
              targetUserId: daddy.id,
              direction: 'left',
              createdAt: faker.date.recent({ days: 30 }),
            });
          }
        }
      }
    }

    this.swipes = swipes;
    this.matches = matches;
    
    console.log(`   ✓ 生成 ${swipes.length} 次滑動`);
    console.log(`     - 喜歡: ${swipes.filter(s => s.direction === 'right').length}`);
    console.log(`     - 不喜歡: ${swipes.filter(s => s.direction === 'left').length}`);
    console.log(`   ✓ 生成 ${matches.length} 個配對`);
    console.log(`     - 活躍: ${matches.filter(m => m.isActive).length}`);
    
    return { swipes, matches };
  }

  getFollows(): FollowData[] {
    return this.follows;
  }

  getSwipes(): SwipeData[] {
    return this.swipes;
  }

  getMatches(): MatchData[] {
    return this.matches;
  }
}
