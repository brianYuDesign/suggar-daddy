/**
 * 內容審核服務
 * 提供檢舉內容查詢、下架/恢復費文、內容統計等功能
 * 下架/恢復動作透過 Kafka 事件廣播
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostEntity, UserEntity } from '@suggar-daddy/database';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { RedisService } from '@suggar-daddy/redis';
import { safeJsonParse } from './safe-json-parse';

/** 檢舉紀錄介面（儲存在 Redis 中） */
interface ReportRecord {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  status: string; // pending | resolved | dismissed
  createdAt: string;
}

@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);

  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly redisService: RedisService,
  ) {}

  /** 分頁查詢被檢舉的內容 */
  async listReports(page: number, limit: number, status?: string) {
    const allReports = await this.getAllReports();
    let filtered = allReports;
    if (status) {
      filtered = allReports.filter((r) => r.status === status);
    }
    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    return { data, total, page, limit };
  }

  /** 取得單一檢舉詳情 */
  async getReportDetail(reportId: string) {
    const reportJson = await this.redisService.get('report:' + reportId);
    if (!reportJson) {
      throw new NotFoundException('檢舉紀錄 ' + reportId + ' 不存在');
    }
    const report = safeJsonParse<ReportRecord>(reportJson, 'report:' + reportId);
    if (!report) {
      throw new NotFoundException('檢舉紀錄 ' + reportId + ' 資料損壞');
    }
    const post = await this.postRepo.findOne({ where: { id: report.postId } });
    return { ...report, post: post || null };
  }

  /** 下架費文，標記為已下架並發送 Kafka 事件 */
  async takeDownPost(postId: string, reason: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('費文 ' + postId + ' 不存在');
    }

    // 在 Redis 標記下架狀態
    await this.redisService.set(
      'post:taken_down:' + postId,
      JSON.stringify({ reason, takenDownAt: new Date().toISOString() }),
    );

    // 發送 Kafka 事件
    await this.kafkaProducer.sendEvent('content.post.taken_down', {
      postId,
      creatorId: post.creatorId,
      reason,
      takenDownAt: new Date().toISOString(),
    });

    await this.resolveReportsForPost(postId);

    this.logger.warn('費文已下架: ' + postId + '，原因: ' + reason);
    return { success: true, message: '費文 ' + postId + ' 已下架' };
  }

  /** 恢復已下架費文 */
  async reinstatePost(postId: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('費文 ' + postId + ' 不存在');
    }

    await this.redisService.del('post:taken_down:' + postId);

    await this.kafkaProducer.sendEvent('content.post.reinstated', {
      postId,
      creatorId: post.creatorId,
      reinstatedAt: new Date().toISOString(),
    });

    this.logger.log('費文已恢復: ' + postId);
    return { success: true, message: '費文 ' + postId + ' 已恢復' };
  }

  /** 取得內容統計資料 */
  async getContentStats() {
    const totalPosts = await this.postRepo.count();
    const allReports = await this.getAllReports();
    const pendingReports = allReports.filter((r) => r.status === 'pending').length;
    const resolvedReports = allReports.filter((r) => r.status === 'resolved').length;
    const takenDownCount = await this.countTakenDownPosts();
    return { totalPosts, pendingReports, resolvedReports, takenDownCount };
  }

  /** 分頁查詢所有貼文 */
  async listPosts(page: number, limit: number, visibility?: string, search?: string) {
    const qb = this.postRepo.createQueryBuilder('post');
    if (visibility) {
      qb.andWhere('post.visibility = :visibility', { visibility });
    }
    if (search) {
      qb.andWhere('post.caption ILIKE :search', { search: `%${search}%` });
    }
    qb.orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [posts, total] = await qb.getManyAndCount();

    const creatorIds = [...new Set(posts.map((p) => p.creatorId))];
    const creators = creatorIds.length > 0
      ? await this.userRepo
          .createQueryBuilder('u')
          .select(['u.id', 'u.email', 'u.displayName', 'u.avatarUrl'])
          .whereInIds(creatorIds)
          .getMany()
      : [];
    const creatorMap = new Map(creators.map((c) => [c.id, c]));

    const data = posts.map((p) => {
      const creator = creatorMap.get(p.creatorId);
      return {
        id: p.id,
        contentType: p.contentType,
        caption: p.caption,
        mediaUrls: p.mediaUrls,
        visibility: p.visibility,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt,
        creator: creator
          ? { id: creator.id, email: creator.email, displayName: creator.displayName, avatarUrl: creator.avatarUrl }
          : null,
      };
    });

    return { data, total, page, limit };
  }

  /** 批量處理檢舉 */
  async batchResolveReports(reportIds: string[]) {
    // Batch read all reports using MGET
    const keys = reportIds.map(id => 'report:' + id);
    const reports = await this.redisService.mget(...keys);

    // Use Redis pipeline for batch write
    const pipeline = this.redisService.getClient().pipeline();
    let resolvedCount = 0;

    reports.forEach((reportJson, index) => {
      if (reportJson) {
        const report = safeJsonParse<ReportRecord>(reportJson, 'report:' + reportIds[index]);
        if (report && report.status === 'pending') {
          report.status = 'resolved';
          pipeline.set('report:' + reportIds[index], JSON.stringify(report));
          resolvedCount++;
        }
      }
    });

    await pipeline.exec();
    this.logger.log(`批量處理檢舉: ${resolvedCount}/${reportIds.length}`);
    return { success: true, resolvedCount };
  }

  // ---- 私有方法 ----

  /** 從 Redis 取得所有檢舉紀錄 */
  private async getAllReports(): Promise<ReportRecord[]> {
    try {
      const client = this.redisService.getClient();
      const keys: string[] = [];
      let cursor = '0';
      do {
        const result = await client.scan(cursor, 'MATCH', 'report:*', 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');
      if (keys.length === 0) return [];
      const values = await Promise.all(keys.map((k) => this.redisService.get(k)));
      return values
        .filter((v): v is string => v !== null)
        .map((v) => safeJsonParse<ReportRecord>(v, 'report'))
        .filter((v): v is ReportRecord => v !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  /** 將某費文的所有檢舉標記為已處理 */
  private async resolveReportsForPost(postId: string) {
    const allReports = await this.getAllReports();
    const related = allReports.filter((r) => r.postId === postId && r.status === 'pending');
    for (const report of related) {
      report.status = 'resolved';
      await this.redisService.set('report:' + report.id, JSON.stringify(report));
    }
  }

  /** 統計已下架費文數量 */
  private async countTakenDownPosts(): Promise<number> {
    try {
      const client = this.redisService.getClient();
      let count = 0;
      let cursor = '0';
      do {
        const result = await client.scan(cursor, 'MATCH', 'post:taken_down:*', 'COUNT', 100);
        cursor = result[0];
        count += result[1].length;
      } while (cursor !== '0');
      return count;
    } catch {
      return 0;
    }
  }

  // ── Auto-moderation queue ─────────────────────────────────────

  async getModerationQueue(source?: string, status?: string, limit = 50) {
    const client = this.redisService.getClient();
    // Get flagged items from the sorted set
    const items = await client.zrevrange('moderation:queue:flagged', 0, limit - 1, 'WITHSCORES');

    const results: Array<{
      contentType: string;
      contentId: string;
      flaggedAt: number;
      moderationResult: Record<string, unknown> | null;
    }> = [];

    for (let i = 0; i < items.length; i += 2) {
      const key = items[i]; // format: "post:contentId"
      const score = parseInt(items[i + 1], 10);
      const [contentType, contentId] = key.split(':');

      // Get moderation result
      const resultRaw = await this.redisService.get(`moderation:result:${contentType}:${contentId}`);
      const moderationResult = resultRaw ? safeJsonParse(resultRaw, 'moderation:result') : null;

      // Apply filters
      if (source && moderationResult) {
        const mr = moderationResult as Record<string, unknown>;
        if (source === 'auto' && !mr.textResult && !mr.imageResults) continue;
        if (source === 'reported' && (mr.textResult || mr.imageResults)) continue;
      }

      results.push({
        contentType,
        contentId,
        flaggedAt: score,
        moderationResult: moderationResult as Record<string, unknown>,
      });
    }

    return { data: results, total: results.length };
  }

  async bulkModerationAction(contentIds: string[], action: 'approve' | 'takedown') {
    let processedCount = 0;
    for (const contentId of contentIds) {
      try {
        if (action === 'takedown') {
          await this.takeDownPost(contentId, 'Bulk moderation takedown');
        } else {
          // Remove from flagged queue
          const client = this.redisService.getClient();
          await client.zrem('moderation:queue:flagged', `post:${contentId}`);
        }
        processedCount++;
      } catch (err) {
        this.logger.warn(`Bulk action failed for ${contentId}: ${err}`);
      }
    }
    return { success: true, processedCount, total: contentIds.length };
  }

  async getModerationStats() {
    const client = this.redisService.getClient();

    const [flaggedCount, totalPosts, pendingReports, takenDownCount] = await Promise.all([
      client.zcard('moderation:queue:flagged'),
      this.postRepo.count(),
      this.getAllReports().then(r => r.filter(rep => rep.status === 'pending').length),
      this.countTakenDownPosts(),
    ]);

    return {
      flaggedCount,
      totalPosts,
      pendingReports,
      takenDownCount,
      autoModeratedToday: 0, // placeholder for future stats
    };
  }

  // ── Appeals ───────────────────────────────────────────────────

  async getAppeals(page: number, limit: number, status?: string) {
    const client = this.redisService.getClient();
    const appealIds = await client.lrange('moderation:appeals:queue', 0, -1);

    if (appealIds.length === 0) return { data: [], total: 0, page, limit };

    const keys = appealIds.map(id => `moderation:appeal:${id}`);
    const values = await this.redisService.mget(...keys);

    let appeals = values
      .filter((v): v is string => v !== null)
      .map(v => safeJsonParse(v, 'appeal'))
      .filter((v): v is Record<string, unknown> => v !== null);

    if (status) {
      appeals = appeals.filter(a => a.status === status);
    }

    const total = appeals.length;
    const start = (page - 1) * limit;
    const data = appeals.slice(start, start + limit);

    return { data, total, page, limit };
  }

  async resolveAppeal(appealId: string, action: 'grant' | 'deny', resolutionNote?: string) {
    const raw = await this.redisService.get(`moderation:appeal:${appealId}`);
    if (!raw) {
      throw new NotFoundException('Appeal not found: ' + appealId);
    }
    const appeal = safeJsonParse(raw, 'appeal:' + appealId) as Record<string, unknown>;
    if (!appeal) {
      throw new NotFoundException('Appeal data corrupted: ' + appealId);
    }

    appeal.status = action === 'grant' ? 'granted' : 'denied';
    appeal.reviewedAt = new Date().toISOString();
    if (resolutionNote) {
      appeal.resolutionNote = resolutionNote;
    }

    await this.redisService.set(`moderation:appeal:${appealId}`, JSON.stringify(appeal));

    // If granted and is a post, reinstate it
    if (action === 'grant' && appeal.contentType === 'post') {
      await this.reinstatePost(appeal.contentId as string);
    }

    this.logger.log(`appeal resolved id=${appealId} action=${action}`);
    return { success: true, appeal };
  }
}
