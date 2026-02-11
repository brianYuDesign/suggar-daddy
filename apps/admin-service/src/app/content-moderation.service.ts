/**
 * 內容審核服務
 * 提供檢舉內容查詢、下架/恢復費文、內容統計等功能
 * 下架/恢復動作透過 Kafka 事件廣播
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostEntity } from '@suggar-daddy/database';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { RedisService } from '@suggar-daddy/redis';

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
    const report: ReportRecord = JSON.parse(reportJson);
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
        .map((v) => JSON.parse(v) as ReportRecord)
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
}
