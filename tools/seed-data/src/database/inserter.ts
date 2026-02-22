import { DataSource } from 'typeorm';
import chalk from 'chalk';

export class DatabaseInserter {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  private logInsert(entity: string, count: number): void {
    console.log(chalk.green(`  ✓ 插入 ${count} 個${entity}`));
  }

  async insertUsers(users: any[]): Promise<void> {
    console.log('👥 插入用戶數據...');
    
    // 使用 SQL 直接插入，明確指定欄位
    const query = `
      INSERT INTO users (
        id, email, "passwordHash", "displayName", "userType", "permissionRole", 
        role, bio, "avatarUrl", latitude, longitude, city, country, 
        "locationUpdatedAt", "dmPrice", "createdAt", "updatedAt"
      ) VALUES 
      ${users.map((_, i) => `(
        $${i * 17 + 1}, $${i * 17 + 2}, $${i * 17 + 3}, $${i * 17 + 4}, $${i * 17 + 5},
        $${i * 17 + 6}, $${i * 17 + 7}, $${i * 17 + 8}, $${i * 17 + 9}, $${i * 17 + 10},
        $${i * 17 + 11}, $${i * 17 + 12}, $${i * 17 + 13}, $${i * 17 + 14}, $${i * 17 + 15},
        $${i * 17 + 16}, $${i * 17 + 17}
      )`).join(',')}
    `;
    
    const params = users.flatMap(u => [
      u.id, u.email, u.passwordHash, u.displayName, u.userType, u.permissionRole,
      u.role || null, u.bio, u.avatarUrl, u.latitude, u.longitude, u.city, u.country,
      u.locationUpdatedAt, u.dmPrice, u.createdAt, u.updatedAt
    ]);
    
    await this.dataSource.query(query, params);
    this.logInsert('用戶', users.length);
  }

  async insertSkills(skills: any[]): Promise<void> {
    console.log('🔧 插入技能標籤...');
    
    const query = `
      INSERT INTO skills (
        id, category, name, "nameEn", "nameZhTw", icon, "isActive", "sortOrder", "createdAt", "updatedAt"
      ) VALUES
      ${skills.map((_, i) => `($${i * 10 + 1}, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, $${i * 10 + 9}, $${i * 10 + 10})`).join(',')}
    `;
    
    const params = skills.flatMap(s => [
      s.id, s.category, s.name, s.nameEn, s.nameZhTw, s.icon, s.isActive, s.sortOrder, s.createdAt, s.updatedAt
    ]);
    
    await this.dataSource.query(query, params);
    this.logInsert('技能', skills.length);
  }

  async insertUserSkills(userSkills: any[]): Promise<void> {
    console.log('🎯 插入用戶技能關聯...');
    
    const batchSize = 100;
    for (let i = 0; i < userSkills.length; i += batchSize) {
      const batch = userSkills.slice(i, i + batchSize);
      const query = `
        INSERT INTO user_skills (id, "userId", "skillId", "proficiencyLevel", "isHighlight", "createdAt")
        VALUES ${batch.map((_, j) => `($${j * 6 + 1}, $${j * 6 + 2}, $${j * 6 + 3}, $${j * 6 + 4}, $${j * 6 + 5}, $${j * 6 + 6})`).join(',')}
      `;
      const params = batch.flatMap(us => [us.id, us.userId, us.skillId, us.proficiencyLevel, false, us.createdAt]);
      await this.dataSource.query(query, params);
    }
    
    this.logInsert('用戶技能', userSkills.length);
  }

  async insertPosts(posts: any[]): Promise<void> {
    console.log('📝 插入貼文...');
    
    const batchSize = 100;
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      const query = `
        INSERT INTO posts (
          id, "creatorId", "contentType", caption, "mediaUrls", visibility, 
          "requiredTierId", "ppvPrice", "likeCount", "commentCount", "videoMeta", "createdAt"
        ) VALUES ${batch.map((_, j) => `(
          $${j * 12 + 1}, $${j * 12 + 2}, $${j * 12 + 3}, $${j * 12 + 4}, $${j * 12 + 5},
          $${j * 12 + 6}, $${j * 12 + 7}, $${j * 12 + 8}, $${j * 12 + 9}, $${j * 12 + 10},
          $${j * 12 + 11}, $${j * 12 + 12}
        )`).join(',')}
      `;
      const params = batch.flatMap(p => [
        p.id, p.creatorId, p.contentType, p.caption, JSON.stringify(p.mediaUrls), p.visibility,
        p.requiredTierId, p.ppvPrice, p.likeCount, p.commentCount, 
        p.videoMeta ? JSON.stringify(p.videoMeta) : null, p.createdAt
      ]);
      await this.dataSource.query(query, params);
    }
    
    this.logInsert('貼文', posts.length);
  }

  async insertStories(stories: any[]): Promise<void> {
    if (stories.length === 0) return;
    
    console.log('📱 插入限時動態...');
    
    const query = `
      INSERT INTO stories (id, "creatorId", "contentType", "mediaUrl", caption, "viewCount", "expiresAt", "createdAt")
      VALUES ${stories.map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`).join(',')}
    `;
    const params = stories.flatMap(s => [s.id, s.creatorId, s.contentType, s.mediaUrl, s.caption, s.viewCount, s.expiresAt, s.createdAt]);
    
    await this.dataSource.query(query, params);
    this.logInsert('限時動態', stories.length);
  }

  async insertPostLikes(likes: any[]): Promise<void> {
    console.log('💝 插入讚...');
    
    const batchSize = 500;
    for (let i = 0; i < likes.length; i += batchSize) {
      const batch = likes.slice(i, i + batchSize);
      const query = `
        INSERT INTO post_likes (id, "postId", "userId", "createdAt")
        VALUES ${batch.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(',')}
      `;
      const params = batch.flatMap(l => [l.id, l.postId, l.userId, l.createdAt]);
      await this.dataSource.query(query, params);
    }
    
    this.logInsert('讚', likes.length);
  }

  async insertPostComments(comments: any[]): Promise<void> {
    console.log('💬 插入評論...');
    
    const batchSize = 500;
    for (let i = 0; i < comments.length; i += batchSize) {
      const batch = comments.slice(i, i + batchSize);
      const query = `
        INSERT INTO post_comments (id, "postId", "userId", content, "createdAt")
        VALUES ${batch.map((_, j) => `($${j * 5 + 1}, $${j * 5 + 2}, $${j * 5 + 3}, $${j * 5 + 4}, $${j * 5 + 5})`).join(',')}
      `;
      const params = batch.flatMap(c => [c.id, c.postId, c.userId, c.content, c.createdAt]);
      await this.dataSource.query(query, params);
    }
    
    this.logInsert('評論', comments.length);
  }

  async insertBookmarks(bookmarks: any[]): Promise<void> {
    if (bookmarks.length === 0) return;
    
    console.log('🔖 插入收藏...');
    
    const query = `
      INSERT INTO bookmarks (id, "userId", "postId", "createdAt")
      VALUES ${bookmarks.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(',')}
    `;
    const params = bookmarks.flatMap(b => [b.id, b.userId, b.postId, b.createdAt]);
    
    await this.dataSource.query(query, params);
    this.logInsert('收藏', bookmarks.length);
  }

  async insertSubscriptionTiers(tiers: any[]): Promise<void> {
    console.log('💎 插入訂閱方案...');
    
    const query = `
      INSERT INTO subscription_tiers (
        id, "creatorId", name, description, "priceMonthly", "priceYearly", benefits, "isActive", "createdAt"
      ) VALUES ${tiers.map((_, i) => `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`).join(',')}
    `;
    const params = tiers.flatMap(t => [
      t.id, t.creatorId, t.name, t.description, t.priceMonthly || t.price, t.priceYearly || (t.price * 10), 
      JSON.stringify(t.benefits), t.isActive !== false, t.createdAt
    ]);
    
    await this.dataSource.query(query, params);
    this.logInsert('訂閱方案', tiers.length);
  }

  async insertSubscriptions(subscriptions: any[]): Promise<void> {
    console.log('📅 插入訂閱記錄...');
    
    const query = `
      INSERT INTO subscriptions (
        id, "subscriberId", "creatorId", "tierId", status, "currentPeriodStart", "currentPeriodEnd", "createdAt"
      ) VALUES ${subscriptions.map((_, i) => `(
        $${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5},
        $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}
      )`).join(',')}
    `;
    const params = subscriptions.flatMap(s => [
      s.id, s.userId || s.subscriberId, s.creatorId, s.tierId, s.status, 
      s.startDate || s.currentPeriodStart, s.endDate || s.currentPeriodEnd, s.createdAt
    ]);
    
    await this.dataSource.query(query, params);
    this.logInsert('訂閱', subscriptions.length);
  }

  async insertTransactions(transactions: any[]): Promise<void> {
    console.log('💳 插入交易記錄...');
    
    const batchSize = 500;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const query = `
        INSERT INTO transactions (
          id, "userId", type, amount, status, "stripePaymentId", "relatedEntityId", "relatedEntityType", metadata, "createdAt"
        ) VALUES ${batch.map((_, j) => `(
          $${j * 10 + 1}, $${j * 10 + 2}, $${j * 10 + 3}, $${j * 10 + 4}, $${j * 10 + 5},
          $${j * 10 + 6}, $${j * 10 + 7}, $${j * 10 + 8}, $${j * 10 + 9}, $${j * 10 + 10}
        )`).join(',')}
      `;
      const params = batch.flatMap(t => [
        t.id, t.userId, t.type, t.amount, t.status, 
        t.providerId || t.stripePaymentId,
        t.metadata?.subscriptionId || t.relatedEntityId,
        t.metadata ? 'subscription' : t.relatedEntityType,
        JSON.stringify(t.metadata || {}), 
        t.createdAt
      ]);
      await this.dataSource.query(query, params);
    }
    
    this.logInsert('交易', transactions.length);
  }

  async insertTips(tips: any[]): Promise<void> {
    if (tips.length === 0) return;
    
    console.log('🎁 插入打賞記錄...');
    
    const query = `
      INSERT INTO tips (id, "fromUserId", "toUserId", amount, message, "stripePaymentId", "createdAt")
      VALUES ${tips.map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`).join(',')}
    `;
    const params = tips.flatMap(t => [t.id, t.fromUserId, t.toUserId, t.amount, t.message, t.stripePaymentId, t.createdAt]);
    
    await this.dataSource.query(query, params);
    this.logInsert('打賞', tips.length);
  }

  async insertDMPurchases(purchases: any[]): Promise<void> {
    if (purchases.length === 0) return;
    
    console.log('💌 插入 DM 購買...');
    
    const query = `
      INSERT INTO dm_purchases (id, "buyerId", "creatorId", amount, "stripePaymentId", "createdAt")
      VALUES ${purchases.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(',')}
    `;
    const params = purchases.flatMap(p => [p.id, p.userId || p.buyerId, p.creatorId, p.amount, p.stripePaymentId, p.createdAt]);
    
    await this.dataSource.query(query, params);
    this.logInsert('DM 購買', purchases.length);
  }

  async insertFollows(follows: any[]): Promise<void> {
    console.log('👥 插入追蹤關係...');
    
    const batchSize = 500;
    for (let i = 0; i < follows.length; i += batchSize) {
      const batch = follows.slice(i, i + batchSize);
      const query = `
        INSERT INTO follows (id, "followerId", "followedId", "createdAt")
        VALUES ${batch.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(',')}
      `;
      const params = batch.flatMap(f => [f.id, f.followerId, f.followingId || f.followedId, f.createdAt]);
      await this.dataSource.query(query, params);
    }
    
    this.logInsert('追蹤', follows.length);
  }

  async insertSwipes(swipes: any[]): Promise<void> {
    console.log('👆 插入滑動記錄...');
    
    const batchSize = 500;
    for (let i = 0; i < swipes.length; i += batchSize) {
      const batch = swipes.slice(i, i + batchSize);
      const query = `
        INSERT INTO swipes (id, "swiperId", "swipedId", action, "createdAt")
        VALUES ${batch.map((_, j) => `($${j * 5 + 1}, $${j * 5 + 2}, $${j * 5 + 3}, $${j * 5 + 4}, $${j * 5 + 5})`).join(',')}
      `;
      const params = batch.flatMap(s => [s.id, s.userId || s.swiperId, s.targetUserId || s.swipedId, s.direction || s.action, s.createdAt]);
      await this.dataSource.query(query, params);
    }
    
    this.logInsert('滑動', swipes.length);
  }

  async insertMatches(matches: any[]): Promise<void> {
    console.log('💘 插入配對記錄...');
    
    const query = `
      INSERT INTO matches (id, "userAId", "userBId", status, "matchedAt")
      VALUES ${matches.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(',')}
    `;
    const params = matches.flatMap(m => [m.id, m.user1Id || m.userAId, m.user2Id || m.userBId, m.isActive ? 'active' : 'inactive', m.matchedAt]);
    
    await this.dataSource.query(query, params);
  }

  async insertBlogs(blogs: any[]): Promise<void> {
    if (blogs.length === 0) return;

    console.log('📰 插入部落格文章...');

    const query = `
      INSERT INTO blogs (
        id, title, slug, content, excerpt, "coverImage",
        category, tags, status,
        "authorId", "authorName", "viewCount",
        "metaTitle", "metaDescription",
        "publishedAt", "createdAt", "updatedAt"
      ) VALUES ${blogs.map((_, i) => `(
        $${i * 17 + 1}, $${i * 17 + 2}, $${i * 17 + 3}, $${i * 17 + 4}, $${i * 17 + 5},
        $${i * 17 + 6}, $${i * 17 + 7}, $${i * 17 + 8}, $${i * 17 + 9}, $${i * 17 + 10},
        $${i * 17 + 11}, $${i * 17 + 12}, $${i * 17 + 13}, $${i * 17 + 14}, $${i * 17 + 15},
        $${i * 17 + 16}, $${i * 17 + 17}
      )`).join(',')}
    `;
    const params = blogs.flatMap(b => [
      b.id, b.title, b.slug, b.content, b.excerpt, b.coverImage,
      b.category, b.tags, b.status,
      b.authorId, b.authorName, b.viewCount,
      b.metaTitle, b.metaDescription,
      b.publishedAt, b.createdAt, b.updatedAt
    ]);

    await this.dataSource.query(query, params);
    this.logInsert('部落格文章', blogs.length);
  }

  async insertInterestTags(tags: any[]): Promise<void> {
    if (tags.length === 0) return;

    console.log('🏷️  插入興趣標籤...');

    const query = `
      INSERT INTO interest_tags (id, category, name, "nameZh", icon, "sortOrder", "isActive", "createdAt", "updatedAt")
      VALUES ${tags.map((_, i) => `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`).join(',')}
    `;
    const params = tags.flatMap(t => [
      t.id, t.category, t.name, t.nameZh, t.icon, t.sortOrder, t.isActive, t.createdAt, t.updatedAt
    ]);

    await this.dataSource.query(query, params);
    this.logInsert('興趣標籤', tags.length);
  }

  async insertUserInterestTags(userTags: any[]): Promise<void> {
    if (userTags.length === 0) return;

    console.log('🏷️  插入用戶興趣標籤...');

    const batchSize = 500;
    for (let i = 0; i < userTags.length; i += batchSize) {
      const batch = userTags.slice(i, i + batchSize);
      const query = `
        INSERT INTO user_interest_tags (id, "userId", "tagId", "createdAt")
        VALUES ${batch.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(',')}
      `;
      const params = batch.flatMap(ut => [ut.id, ut.userId, ut.tagId, ut.createdAt]);
      await this.dataSource.query(query, params);
    }

    this.logInsert('用戶興趣標籤', userTags.length);
  }

  async insertUserBehaviorEvents(events: any[]): Promise<void> {
    if (events.length === 0) return;

    console.log('📊 插入行為事件...');

    const batchSize = 500;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const query = `
        INSERT INTO user_behavior_events (id, "userId", "targetUserId", "eventType", metadata, "createdAt")
        VALUES ${batch.map((_, j) => `($${j * 6 + 1}, $${j * 6 + 2}, $${j * 6 + 3}, $${j * 6 + 4}, $${j * 6 + 5}, $${j * 6 + 6})`).join(',')}
      `;
      const params = batch.flatMap(e => [
        e.id, e.userId, e.targetUserId, e.eventType, JSON.stringify(e.metadata), e.createdAt
      ]);
      await this.dataSource.query(query, params);
    }

    this.logInsert('行為事件', events.length);
  }

  async insertStaticPages(pages: any[]): Promise<void> {
    if (pages.length === 0) return;

    console.log('📄 插入靜態頁面...');

    const query = `
      INSERT INTO static_pages (
        id, title, slug, content, "pageType", status,
        "metaTitle", "metaDescription", "lastEditedBy",
        "publishedAt", "createdAt", "updatedAt"
      ) VALUES ${pages.map((_, i) => `(
        $${i * 12 + 1}, $${i * 12 + 2}, $${i * 12 + 3}, $${i * 12 + 4}, $${i * 12 + 5},
        $${i * 12 + 6}, $${i * 12 + 7}, $${i * 12 + 8}, $${i * 12 + 9}, $${i * 12 + 10},
        $${i * 12 + 11}, $${i * 12 + 12}
      )`).join(',')}
    `;
    const params = pages.flatMap(p => [
      p.id, p.title, p.slug, p.content, p.pageType, p.status,
      p.metaTitle, p.metaDescription, p.lastEditedBy,
      p.publishedAt, p.createdAt, p.updatedAt
    ]);

    await this.dataSource.query(query, params);
    this.logInsert('靜態頁面', pages.length);
  }

  async clearAllData(): Promise<void> {
    console.log(chalk.yellow('\n⚠️  清除現有數據...'));

    const tables = [
      'user_behavior_events',
      'user_interest_tags',
      'interest_tags',
      'static_pages',
      'blogs',
      'matches',
      'swipes',
      'follows',
      'dm_purchases',
      'tips',
      'transactions',
      'subscriptions',
      'subscription_tiers',
      'bookmarks',
      'post_comments',
      'post_likes',
      'stories',
      'posts',
      'user_skills',
      'skills',
      'users',
    ];

    for (const table of tables) {
      try {
        await this.dataSource.query(`TRUNCATE TABLE "${table}" CASCADE`);
        console.log(chalk.gray(`  ✓ 清除 ${table}`));
      } catch (error) {
        // 表可能不存在，忽略錯誤
      }
    }
    
    console.log(chalk.green('✓ 數據清除完成\n'));
  }
}
