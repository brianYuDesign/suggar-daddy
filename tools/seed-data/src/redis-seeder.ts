#!/usr/bin/env ts-node

/**
 * Redis Seeder — 從 PostgreSQL 讀取 seed 資料並寫入 Redis
 *
 * 用法：
 *   npx ts-node src/redis-seeder.ts          # 全量同步
 *   npx ts-node src/redis-seeder.ts --clear   # 先清空 Redis 再同步
 *
 * 環境變數：
 *   POSTGRES_HOST / POSTGRES_PORT / POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB
 *   REDIS_HOST / REDIS_PORT
 */

import { DataSource } from 'typeorm';
import chalk from 'chalk';
import Redis from 'ioredis';

// ─── Config ──────────────────────────────────────────

const PG_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'suggar_daddy',
};

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const shouldClear = process.argv.includes('--clear');

// ─── Helpers ─────────────────────────────────────────

let totalKeys = 0;

function log(icon: string, msg: string, count?: number) {
  if (count !== undefined) {
    totalKeys += count;
    console.log(chalk.green(`  ${icon} ${msg} (${count} keys)`));
  } else {
    console.log(chalk.blue(`${icon} ${msg}`));
  }
}

function toISO(d: Date | string | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : d;
}

// ─── Main ────────────────────────────────────────────

async function main() {
  console.log(chalk.cyan('╔════════════════════════════════════╗'));
  console.log(chalk.cyan('║    🔴 Redis Seeder from PG         ║'));
  console.log(chalk.cyan('╚════════════════════════════════════╝\n'));

  // Connect PG
  log('🐘', '連接 PostgreSQL...');
  const ds = new DataSource({
    type: 'postgres',
    ...PG_CONFIG,
    synchronize: false,
    logging: false,
  });
  await ds.initialize();
  log('✓', '已連接 PostgreSQL');

  // Connect Redis
  log('🔴', '連接 Redis...');
  const redis = new Redis({
    host: REDIS_CONFIG.host,
    port: REDIS_CONFIG.port,
    maxRetriesPerRequest: 3,
  });
  await redis.ping();
  log('✓', '已連接 Redis');

  if (shouldClear) {
    console.log(chalk.yellow('\n⚠️  清空 Redis...'));
    await redis.flushdb();
    console.log(chalk.green('  ✓ Redis 已清空\n'));
  }

  // ────────────────────────────────────────────────────
  // 1. Users → geo:users, users:all, users:creators, user:email:*, user:{userId}
  // ────────────────────────────────────────────────────
  log('👥', '同步用戶...');
  const users: any[] = await ds.query(`
    SELECT id, email, "passwordHash", "displayName", "userType", "permissionRole", role,
           bio, "avatarUrl", latitude, longitude, city, country,
           "locationUpdatedAt", "dmPrice", "createdAt", "updatedAt"
    FROM users
  `);

  const pipeline = redis.pipeline();
  let geoCount = 0;

  for (const u of users) {
    // users:all
    pipeline.sadd('users:all', u.id);

    // users:creators
    if (u.permissionRole === 'creator') {
      pipeline.sadd('users:creators', u.id);
    }

    // user:email:{email} → userId
    pipeline.set(`user:email:${u.email}`, u.id);

    // user:{userId} → JSON (shared by auth-service + user-service)
    // auth-service reads: userId, email, passwordHash, userType, permissionRole, displayName, bio, accountStatus, emailVerified, createdAt
    // user-service reads: id, userType, permissionRole, displayName, bio, avatarUrl, followerCount, followingCount, preferences, verificationStatus, lastActiveAt, dmPrice, createdAt, updatedAt, latitude, longitude, city, country
    pipeline.set(`user:${u.id}`, JSON.stringify({
      // auth-service fields
      userId: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      accountStatus: 'active',
      emailVerified: true,
      // user-service fields (UserRecord)
      id: u.id,
      userType: u.userType,
      permissionRole: u.permissionRole || 'subscriber',
      displayName: u.displayName,
      bio: u.bio || '',
      avatarUrl: u.avatarUrl || null,
      latitude: u.latitude,
      longitude: u.longitude,
      city: u.city || null,
      country: u.country || null,
      dmPrice: u.dmPrice || null,
      preferences: {},
      verificationStatus: 'unverified',
      lastActiveAt: toISO(u.updatedAt),
      followerCount: 0,
      followingCount: 0,
      createdAt: toISO(u.createdAt),
      updatedAt: toISO(u.updatedAt),
    }));

    // geo:users (only if lat/lng exist)
    if (u.latitude != null && u.longitude != null) {
      pipeline.geoadd('geo:users', u.longitude, u.latitude, u.id);
      geoCount++;
    }
  }

  await pipeline.exec();
  log('✓', `用戶集合 (users:all=${users.length}, creators=${users.filter((u: any) => u.permissionRole === 'creator').length}, auth-keys=${users.length})`, users.length * 3 + geoCount);

  // ────────────────────────────────────────────────────
  // 2. Follows → user:following:{}, user:followers:{}
  // ────────────────────────────────────────────────────
  log('🔗', '同步追蹤關係...');
  const follows: any[] = await ds.query(`SELECT "followerId", "followedId" FROM follows`);

  const pipe2 = redis.pipeline();
  for (const f of follows) {
    pipe2.sadd(`user:following:${f.followerId}`, f.followedId);
    pipe2.sadd(`user:followers:${f.followedId}`, f.followerId);
  }
  await pipe2.exec();
  log('✓', `追蹤 (${follows.length} 筆)`, follows.length * 2);

  // Update follower/following counts in user:{id} keys
  const followerCounts = new Map<string, number>();
  const followingCounts = new Map<string, number>();
  for (const f of follows) {
    followingCounts.set(f.followerId, (followingCounts.get(f.followerId) || 0) + 1);
    followerCounts.set(f.followedId, (followerCounts.get(f.followedId) || 0) + 1);
  }
  const pipeCountUpdate = redis.pipeline();
  for (const u of users) {
    const fc = followerCounts.get(u.id) || 0;
    const fgc = followingCounts.get(u.id) || 0;
    if (fc > 0 || fgc > 0) {
      const existing = await redis.get(`user:${u.id}`);
      if (existing) {
        const parsed = JSON.parse(existing);
        parsed.followerCount = fc;
        parsed.followingCount = fgc;
        pipeCountUpdate.set(`user:${u.id}`, JSON.stringify(parsed));
      }
    }
  }
  await pipeCountUpdate.exec();

  // ────────────────────────────────────────────────────
  // 3. Posts → post:*, posts:public:ids, posts:creator:*
  // ────────────────────────────────────────────────────
  log('📝', '同步貼文...');
  const posts: any[] = await ds.query(`
    SELECT id, "creatorId", "contentType", caption, "mediaUrls", visibility,
           "requiredTierId", "ppvPrice", "likeCount", "commentCount", "createdAt", "videoMeta"
    FROM posts
  `);

  const pipe3 = redis.pipeline();
  for (const p of posts) {
    const postJson = JSON.stringify({
      id: p.id,
      creatorId: p.creatorId,
      contentType: p.contentType,
      caption: p.caption,
      mediaUrls: typeof p.mediaUrls === 'string' ? JSON.parse(p.mediaUrls) : (p.mediaUrls || []),
      visibility: p.visibility,
      requiredTierId: p.requiredTierId,
      ppvPrice: p.ppvPrice ? Number(p.ppvPrice) : null,
      likeCount: p.likeCount || 0,
      commentCount: p.commentCount || 0,
      bookmarkCount: 0,
      createdAt: toISO(p.createdAt),
      updatedAt: toISO(p.createdAt),
      videoMeta: p.videoMeta || null,
    });

    pipe3.set(`post:${p.id}`, postJson, 'EX', 3600);
    pipe3.lpush(`posts:creator:${p.creatorId}`, p.id);

    if (p.visibility === 'public') {
      pipe3.lpush('posts:public:ids', p.id);
    }
  }
  await pipe3.exec();
  log('✓', `貼文 (${posts.length} 篇, public=${posts.filter((p: any) => p.visibility === 'public').length})`, posts.length * 2);

  // ────────────────────────────────────────────────────
  // 4. Post Likes → post:{postId}:likes
  // ────────────────────────────────────────────────────
  log('💝', '同步按讚...');
  const likes: any[] = await ds.query(`SELECT "postId", "userId" FROM post_likes`);

  // batch in chunks of 5000
  for (let i = 0; i < likes.length; i += 5000) {
    const batch = likes.slice(i, i + 5000);
    const p = redis.pipeline();
    for (const l of batch) {
      p.sadd(`post:${l.postId}:likes`, l.userId);
    }
    await p.exec();
  }
  log('✓', `按讚 (${likes.length} 筆)`, likes.length);

  // ────────────────────────────────────────────────────
  // 5. Comments → comment:*, post:{postId}:comments
  // ────────────────────────────────────────────────────
  log('💬', '同步評論...');
  const comments: any[] = await ds.query(`
    SELECT id, "postId", "userId", content, "createdAt"
    FROM post_comments ORDER BY "createdAt" ASC
  `);

  const pipe5 = redis.pipeline();
  for (const c of comments) {
    pipe5.set(`comment:${c.id}`, JSON.stringify({
      id: c.id,
      postId: c.postId,
      userId: c.userId,
      content: c.content,
      parentCommentId: null,
      replyCount: 0,
      createdAt: toISO(c.createdAt),
    }));
    pipe5.rpush(`post:${c.postId}:comments`, c.id);
  }
  await pipe5.exec();
  log('✓', `評論 (${comments.length} 筆)`, comments.length * 2);

  // ────────────────────────────────────────────────────
  // 6. Bookmarks → user:bookmarks:{userId}
  // ────────────────────────────────────────────────────
  log('🔖', '同步收藏...');
  const bookmarks: any[] = await ds.query(`SELECT "userId", "postId" FROM bookmarks`);

  const pipe6 = redis.pipeline();
  for (const b of bookmarks) {
    pipe6.sadd(`user:bookmarks:${b.userId}`, b.postId);
  }
  await pipe6.exec();
  log('✓', `收藏 (${bookmarks.length} 筆)`, bookmarks.length);

  // ────────────────────────────────────────────────────
  // 7. Subscription Tiers → tier:*, tiers:creator:*, tiers:all
  // ────────────────────────────────────────────────────
  log('💎', '同步訂閱方案...');
  const tiers: any[] = await ds.query(`
    SELECT id, "creatorId", name, description, "priceMonthly", "priceYearly",
           benefits, "isActive", "createdAt"
    FROM subscription_tiers
  `);

  const pipe7 = redis.pipeline();
  for (const t of tiers) {
    pipe7.set(`tier:${t.id}`, JSON.stringify({
      id: t.id,
      creatorId: t.creatorId,
      name: t.name,
      description: t.description,
      priceMonthly: Number(t.priceMonthly),
      priceYearly: Number(t.priceYearly),
      benefits: typeof t.benefits === 'string' ? JSON.parse(t.benefits) : (t.benefits || []),
      isActive: t.isActive,
      createdAt: toISO(t.createdAt),
    }));
    pipe7.lpush(`tiers:creator:${t.creatorId}`, t.id);
    pipe7.sadd('tiers:all', t.id);
  }
  await pipe7.exec();
  log('✓', `訂閱方案 (${tiers.length} 個)`, tiers.length * 3);

  // ────────────────────────────────────────────────────
  // 8. Subscriptions → subscription:*, subscriptions:subscriber/creator:*, sub:active:*, subscriptions:all
  // ────────────────────────────────────────────────────
  log('📅', '同步訂閱記錄...');
  const subs: any[] = await ds.query(`
    SELECT id, "subscriberId", "creatorId", "tierId", status,
           "currentPeriodStart", "currentPeriodEnd", "createdAt"
    FROM subscriptions
  `);

  const pipe8 = redis.pipeline();
  for (const s of subs) {
    pipe8.set(`subscription:${s.id}`, JSON.stringify({
      id: s.id,
      subscriberId: s.subscriberId,
      creatorId: s.creatorId,
      tierId: s.tierId,
      status: s.status,
      stripeSubscriptionId: null,
      currentPeriodStart: toISO(s.currentPeriodStart),
      currentPeriodEnd: toISO(s.currentPeriodEnd),
      createdAt: toISO(s.createdAt),
      cancelledAt: null,
    }));
    pipe8.lpush(`subscriptions:subscriber:${s.subscriberId}`, s.id);
    pipe8.lpush(`subscriptions:creator:${s.creatorId}`, s.id);
    pipe8.sadd('subscriptions:all', s.id);

    if (s.status === 'active') {
      pipe8.sadd(`sub:active:${s.subscriberId}:${s.creatorId}`, s.tierId);
    }
  }
  await pipe8.exec();
  const activeSubs = subs.filter((s: any) => s.status === 'active').length;
  log('✓', `訂閱 (${subs.length} 筆, active=${activeSubs})`, subs.length * 4 + activeSubs);

  // ────────────────────────────────────────────────────
  // 9. Swipes → swipe:*, user_swipes:*
  // ────────────────────────────────────────────────────
  log('👆', '同步滑動...');
  const swipes: any[] = await ds.query(`
    SELECT id, "swiperId", "swipedId", action, "createdAt" FROM swipes
  `);

  for (let i = 0; i < swipes.length; i += 5000) {
    const batch = swipes.slice(i, i + 5000);
    const p = redis.pipeline();
    for (const s of batch) {
      p.set(`swipe:${s.swiperId}:${s.swipedId}`, JSON.stringify({
        swiperId: s.swiperId,
        swipedId: s.swipedId,
        action: s.action,
        createdAt: toISO(s.createdAt),
      }));
      p.sadd(`user_swipes:${s.swiperId}`, s.swipedId);
    }
    await p.exec();
  }
  log('✓', `滑動 (${swipes.length} 筆)`, swipes.length * 2);

  // ────────────────────────────────────────────────────
  // 10. Matches → match:*, user_matches:*
  // ────────────────────────────────────────────────────
  log('💘', '同步配對...');
  const matches: any[] = await ds.query(`
    SELECT id, "userAId", "userBId", status, "matchedAt" FROM matches
  `);

  const pipe10 = redis.pipeline();
  for (const m of matches) {
    pipe10.set(`match:${m.id}`, JSON.stringify({
      id: m.id,
      userAId: m.userAId,
      userBId: m.userBId,
      matchedAt: toISO(m.matchedAt),
      status: m.status,
    }));
    pipe10.sadd(`user_matches:${m.userAId}`, m.id);
    pipe10.sadd(`user_matches:${m.userBId}`, m.id);
  }
  await pipe10.exec();
  log('✓', `配對 (${matches.length} 筆)`, matches.length * 3);

  // ────────────────────────────────────────────────────
  // 10.5. Conversations + Messages → conversation:*, user:*:conversations, msg:*, conversation:*:messages
  // ────────────────────────────────────────────────────
  log('💬', '建立對話與訊息...');

  const sampleMessages = [
    '嗨！很高興認識你 😊',
    '你好～看到你的檔案覺得很有趣',
    '謝謝你的喜歡！最近好嗎？',
    '今天天氣不錯呢',
    '週末有什麼計畫嗎？',
    '你的照片很好看！',
    '要不要一起喝杯咖啡？☕',
    '哈哈 真的嗎？',
    '好的，那我們約個時間吧',
    '晚安～明天再聊 🌙',
  ];

  let convCount = 0;
  let msgCount = 0;

  for (let i = 0; i < matches.length; i += 50) {
    const batch = matches.slice(i, i + 50);
    const pipeConv = redis.pipeline();

    for (const m of batch) {
      // conversationId = sorted pair joined by ::
      const convId = [m.userAId, m.userBId].sort().join('::');

      // conversation:{id}
      pipeConv.set(`conversation:${convId}`, JSON.stringify({
        id: convId,
        participantIds: [m.userAId, m.userBId],
      }));

      // user:{userId}:conversations
      pipeConv.sadd(`user:${m.userAId}:conversations`, convId);
      pipeConv.sadd(`user:${m.userBId}:conversations`, convId);

      convCount++;

      // Add 2-5 sample messages per conversation
      const numMsgs = 2 + Math.floor(Math.random() * 4);
      const matchTime = m.matchedAt ? new Date(m.matchedAt).getTime() : Date.now() - 86400000;

      for (let j = 0; j < numMsgs; j++) {
        const senderId = j % 2 === 0 ? m.userAId : m.userBId;
        const msgTime = matchTime + (j + 1) * 60000; // 1 min apart
        const msgId = `msg-seed-${convId.replace(/::/g, '-')}-${j}`;
        const content = sampleMessages[(i + j) % sampleMessages.length];

        pipeConv.set(`msg:${msgId}`, JSON.stringify({
          id: msgId,
          conversationId: convId,
          senderId,
          content,
          createdAt: new Date(msgTime).toISOString(),
        }));
        // lPush pushes to head → newest first (matches getMessages sort)
        pipeConv.lpush(`conversation:${convId}:messages`, msgId);
        msgCount++;
      }
    }
    await pipeConv.exec();
  }
  log('✓', `對話 (${convCount} 個, ${msgCount} 則訊息)`, convCount * 3 + msgCount * 2);

  // ────────────────────────────────────────────────────
  // 11. Transactions → transaction:*, transactions:user:*
  // ────────────────────────────────────────────────────
  log('💳', '同步交易...');
  const txns: any[] = await ds.query(`
    SELECT id, "userId", type, amount, status, "stripePaymentId",
           "relatedEntityId", "relatedEntityType", metadata, "createdAt"
    FROM transactions ORDER BY "createdAt" ASC
  `);

  for (let i = 0; i < txns.length; i += 2000) {
    const batch = txns.slice(i, i + 2000);
    const p = redis.pipeline();
    for (const t of batch) {
      p.set(`transaction:${t.id}`, JSON.stringify({
        id: t.id,
        userId: t.userId,
        type: t.type,
        amount: Number(t.amount),
        status: t.status,
        stripePaymentId: t.stripePaymentId,
        relatedEntityId: t.relatedEntityId,
        relatedEntityType: t.relatedEntityType,
        metadata: t.metadata || {},
        createdAt: toISO(t.createdAt),
      }));
      p.lpush(`transactions:user:${t.userId}`, t.id);
      const score = new Date(t.createdAt).getTime();
      p.zadd('transactions:all:by-time', score.toString(), t.id);
    }
    await p.exec();
  }
  log('✓', `交易 (${txns.length} 筆)`, txns.length * 3);

  // ────────────────────────────────────────────────────
  // 12. Wallets — 根據交易記錄計算 creator 餘額
  // ────────────────────────────────────────────────────
  log('💰', '計算錢包餘額...');
  const creatorIds: string[] = users.filter((u: any) => u.permissionRole === 'creator').map((u: any) => u.id);

  // 用 SQL 聚合每位 creator 的收入
  const walletData: any[] = creatorIds.length > 0
    ? await ds.query(`
        SELECT
          t."userId",
          COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) AS "totalEarnings"
        FROM transactions t
        WHERE t."userId" = ANY($1)
        GROUP BY t."userId"
      `, [creatorIds])
    : [];

  const walletMap = new Map(walletData.map((w: any) => [w.userId, Number(w.totalEarnings)]));

  const pipe12 = redis.pipeline();
  for (const cid of creatorIds) {
    const earnings = walletMap.get(cid) || 0;
    pipe12.set(`wallet:${cid}`, JSON.stringify({
      userId: cid,
      balance: Math.round(earnings * 0.8 * 100) / 100, // 扣除 20% 平台費
      pendingBalance: 0,
      totalEarnings: Math.round(earnings * 0.8 * 100) / 100,
      totalWithdrawn: 0,
      updatedAt: new Date().toISOString(),
    }));
  }
  await pipe12.exec();
  log('✓', `錢包 (${creatorIds.length} 位創作者)`, creatorIds.length);

  // ────────────────────────────────────────────────────
  // 13. DM Purchases → dm:unlock:*
  // ────────────────────────────────────────────────────
  log('💌', '同步 DM 購買...');
  const dms: any[] = await ds.query(`SELECT "buyerId", "creatorId" FROM dm_purchases`);

  const pipe13 = redis.pipeline();
  for (const d of dms) {
    pipe13.set(`dm:unlock:${d.buyerId}:${d.creatorId}`, '1');
  }
  await pipe13.exec();
  log('✓', `DM 購買 (${dms.length} 筆)`, dms.length);

  // ────────────────────────────────────────────────────
  // 14. Feeds — 為每個用戶建立 feed（基於追蹤 + 公開貼文）
  // ────────────────────────────────────────────────────
  log('📰', '建立用戶 Feed...');

  // 按 creator 分組貼文
  const postsByCreator = new Map<string, any[]>();
  for (const p of posts) {
    const list = postsByCreator.get(p.creatorId) || [];
    list.push(p);
    postsByCreator.set(p.creatorId, list);
  }

  let feedCount = 0;
  for (let i = 0; i < users.length; i += 50) {
    const batch = users.slice(i, i + 50);
    const pf = redis.pipeline();

    for (const user of batch) {
      // 取得此用戶追蹤的人
      const followingIds = follows
        .filter((f: any) => f.followerId === user.id)
        .map((f: any) => f.followedId);

      // 追蹤者的貼文 + 所有公開貼文（限最近 100 篇）
      const feedPosts: any[] = [];
      for (const cid of followingIds) {
        const cp = postsByCreator.get(cid) || [];
        feedPosts.push(...cp);
      }
      // 加入公開貼文
      for (const p of posts) {
        if (p.visibility === 'public' && !followingIds.includes(p.creatorId)) {
          feedPosts.push(p);
        }
      }

      // 去重 + 按時間排序取最近 200
      const seen = new Set<string>();
      const unique = feedPosts.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const top = unique.slice(0, 200);

      if (top.length > 0) {
        const args: (string | number)[] = [];
        for (const p of top) {
          args.push(new Date(p.createdAt).getTime(), p.id);
        }
        pf.zadd(`feed:${user.id}`, ...args.map(String));
        feedCount++;
      }
    }
    await pf.exec();
  }
  log('✓', `Feed (${feedCount} 個用戶)`, feedCount);

  // ────────────────────────────────────────────────────
  // 15. Tips → tip:*, tips:from:*, tips:to:*
  // ────────────────────────────────────────────────────
  log('🎁', '同步打賞...');
  const tips: any[] = await ds.query(`
    SELECT id, "fromUserId", "toUserId", amount, message, "stripePaymentId", "createdAt"
    FROM tips
  `);

  const pipe15 = redis.pipeline();
  for (const t of tips) {
    pipe15.set(`tip:${t.id}`, JSON.stringify({
      id: t.id,
      fromUserId: t.fromUserId,
      toUserId: t.toUserId,
      amount: Number(t.amount),
      message: t.message,
      stripePaymentId: t.stripePaymentId,
      createdAt: toISO(t.createdAt),
    }));
    pipe15.lpush(`tips:from:${t.fromUserId}`, t.id);
    pipe15.lpush(`tips:to:${t.toUserId}`, t.id);
  }
  await pipe15.exec();
  log('✓', `打賞 (${tips.length} 筆)`, tips.length * 3);

  // ────────────────────────────────────────────────────
  // Done
  // ────────────────────────────────────────────────────
  const dbSize = await redis.dbsize();

  console.log(chalk.gray('\n' + '─'.repeat(40)));
  console.log(chalk.green(`\n✅ Redis 同步完成！`));
  console.log(chalk.yellow(`📊 Redis 總 key 數: ${dbSize}`));
  console.log(chalk.gray('─'.repeat(40)));

  console.log(chalk.cyan('\n📋 同步摘要：'));
  console.log(`  👥 用戶: ${users.length} (geo: ${geoCount})`);
  console.log(`  🔗 追蹤: ${follows.length}`);
  console.log(`  📝 貼文: ${posts.length}`);
  console.log(`  💝 按讚: ${likes.length}`);
  console.log(`  💬 評論: ${comments.length}`);
  console.log(`  🔖 收藏: ${bookmarks.length}`);
  console.log(`  💎 訂閱方案: ${tiers.length}`);
  console.log(`  📅 訂閱: ${subs.length} (active: ${activeSubs})`);
  console.log(`  👆 滑動: ${swipes.length}`);
  console.log(`  💘 配對: ${matches.length}`);
  console.log(`  💬 對話: ${convCount} (${msgCount} 則訊息)`);
  console.log(`  💳 交易: ${txns.length}`);
  console.log(`  💰 錢包: ${creatorIds.length}`);
  console.log(`  🎁 打賞: ${tips.length}`);
  console.log(`  💌 DM購買: ${dms.length}`);
  console.log(`  📰 Feed: ${feedCount}`);

  await ds.destroy();
  redis.disconnect();
}

main().catch((err) => {
  console.error(chalk.red('\n❌ 錯誤:'), err);
  process.exit(1);
});
