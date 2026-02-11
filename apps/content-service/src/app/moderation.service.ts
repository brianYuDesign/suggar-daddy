import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { CONTENT_EVENTS } from '@suggar-daddy/common';
import { PostService } from './post.service';

const REPORT_KEY = (id: string) => `content:report:${id}`;
const REPORTS_QUEUE = 'content:reports:queue';
const REPORTS_BY_POST = (postId: string) => `content:reports:post:${postId}`;
const REPORTS_BY_USER = (userId: string) => `content:reports:reporter:${userId}`;
const TAKEN_DOWN_SET = 'content:taken-down';

// Auto-takedown threshold
const AUTO_TAKEDOWN_REPORT_COUNT = 5;

interface ContentReport {
  id: string;
  reporterId: string;
  postId: string;
  reason: 'spam' | 'nudity' | 'harassment' | 'violence' | 'copyright' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly postService: PostService,
  ) {}

  private genId(): string {
    return `cr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ── Report Content ──────────────────────────────────────────────

  async reportPost(
    reporterId: string,
    postId: string,
    reason: ContentReport['reason'],
    description?: string,
  ): Promise<ContentReport> {
    // Verify post exists
    await this.postService.findOne(postId);

    if (!reason) {
      throw new BadRequestException('Report reason is required');
    }

    const id = this.genId();
    const report: ContentReport = {
      id,
      reporterId,
      postId,
      reason,
      description: description?.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await this.redis.set(REPORT_KEY(id), JSON.stringify(report));
    await this.redis.lPush(REPORTS_QUEUE, id);
    await this.redis.lPush(REPORTS_BY_POST(postId), id);
    await this.redis.lPush(REPORTS_BY_USER(reporterId), id);

    this.logger.log(`content reported id=${id} postId=${postId} reason=${reason}`);

    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_REPORTED, {
      reportId: id,
      reporterId,
      postId,
      reason,
      createdAt: report.createdAt,
    });

    // Auto-takedown if report threshold reached
    const reportCount = await this.getReportCountForPost(postId);
    if (reportCount >= AUTO_TAKEDOWN_REPORT_COUNT) {
      await this.takeDownPost(postId, 'system');
      this.logger.warn(`auto-takedown triggered postId=${postId} reportCount=${reportCount}`);
    }

    return report;
  }

  private async getReportCountForPost(postId: string): Promise<number> {
    const ids = await this.redis.lRange(REPORTS_BY_POST(postId), 0, -1);
    return ids.length;
  }

  // ── Moderation Queue ────────────────────────────────────────────

  async getReportQueue(limit = 50): Promise<ContentReport[]> {
    const ids = await this.redis.lRange(REPORTS_QUEUE, 0, limit - 1);
    const out: ContentReport[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(REPORT_KEY(id));
      if (raw) {
        const report = JSON.parse(raw) as ContentReport;
        if (report.status === 'pending') out.push(report);
      }
    }
    return out;
  }

  async getReportsForPost(postId: string): Promise<ContentReport[]> {
    const ids = await this.redis.lRange(REPORTS_BY_POST(postId), 0, -1);
    const out: ContentReport[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(REPORT_KEY(id));
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  // ── Admin Actions ───────────────────────────────────────────────

  async reviewReport(
    reportId: string,
    action: 'dismiss' | 'takedown',
    reviewerId: string,
  ): Promise<ContentReport> {
    const raw = await this.redis.get(REPORT_KEY(reportId));
    if (!raw) {
      throw new NotFoundException(`Report not found: ${reportId}`);
    }

    const report = JSON.parse(raw) as ContentReport;
    if (report.status !== 'pending') {
      throw new BadRequestException(`Report is already ${report.status}`);
    }

    report.reviewedAt = new Date().toISOString();
    report.reviewedBy = reviewerId;

    if (action === 'dismiss') {
      report.status = 'dismissed';
    } else {
      report.status = 'actioned';
      await this.takeDownPost(report.postId, reviewerId);
    }

    await this.redis.set(REPORT_KEY(reportId), JSON.stringify(report));
    this.logger.log(`report reviewed id=${reportId} action=${action} reviewer=${reviewerId}`);
    return report;
  }

  async takeDownPost(postId: string, actionBy: string): Promise<{ success: boolean }> {
    const post = await this.postService.findOne(postId);

    // Mark as taken down
    post.moderationStatus = 'taken_down';
    post.moderationActionBy = actionBy;
    post.moderationActionAt = new Date().toISOString();
    post.visibility = 'hidden';
    await this.redis.set(`post:${postId}`, JSON.stringify(post));
    await this.redis.sAdd(TAKEN_DOWN_SET, postId);

    this.logger.log(`post taken down postId=${postId} by=${actionBy}`);

    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_TAKEN_DOWN, {
      postId,
      creatorId: post.creatorId,
      actionBy,
      takenDownAt: post.moderationActionAt,
    });

    return { success: true };
  }

  async reinstatePost(postId: string, actionBy: string): Promise<{ success: boolean }> {
    const post = await this.postService.findOne(postId);

    post.moderationStatus = 'cleared';
    post.moderationActionBy = actionBy;
    post.moderationActionAt = new Date().toISOString();
    post.visibility = 'public';
    await this.redis.set(`post:${postId}`, JSON.stringify(post));
    await this.redis.sRem(TAKEN_DOWN_SET, postId);

    this.logger.log(`post reinstated postId=${postId} by=${actionBy}`);

    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_REINSTATED, {
      postId,
      creatorId: post.creatorId,
      actionBy,
      reinstatedAt: post.moderationActionAt,
    });

    return { success: true };
  }

  async getTakenDownPosts(): Promise<string[]> {
    return this.redis.sMembers(TAKEN_DOWN_SET);
  }
}
