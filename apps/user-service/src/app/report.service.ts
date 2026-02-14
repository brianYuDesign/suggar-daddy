import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { USER_EVENTS } from '@suggar-daddy/common';
import { ReportRecord, REPORT_KEY, REPORTS_PENDING, REPORTS_BY_USER } from './user.types';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async createReport(
    reporterId: string,
    targetType: 'user' | 'post' | 'comment',
    targetId: string,
    reason: string,
    description?: string,
  ): Promise<ReportRecord> {
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException('Report reason must be at least 3 characters');
    }

    const id = `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const report: ReportRecord = {
      id,
      reporterId,
      targetType,
      targetId,
      reason: reason.trim(),
      description: description?.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await this.redisService.set(REPORT_KEY(id), JSON.stringify(report));
    await this.redisService.lPush(REPORTS_PENDING, id);
    await this.redisService.lPush(REPORTS_BY_USER(reporterId), id);

    this.logger.log(`report created id=${id} reporter=${reporterId} targetType=${targetType} targetId=${targetId}`);
    await this.kafkaProducer.sendEvent(USER_EVENTS.USER_REPORTED, {
      reportId: id,
      reporterId,
      targetType,
      targetId,
      reason: report.reason,
      createdAt: report.createdAt,
    });
    return report;
  }

  async getPendingReports(): Promise<ReportRecord[]> {
    const ids = await this.redisService.lRange(REPORTS_PENDING, 0, -1);
    if (ids.length === 0) return [];

    const keys = ids.map(id => REPORT_KEY(id));
    const values = await this.redisService.mget(...keys);

    const out: ReportRecord[] = [];
    for (const raw of values) {
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async updateReportStatus(
    reportId: string,
    status: 'reviewed' | 'actioned' | 'dismissed',
  ): Promise<ReportRecord> {
    const raw = await this.redisService.get(REPORT_KEY(reportId));
    if (!raw) {
      throw new NotFoundException(`Report not found: ${reportId}`);
    }
    const report = JSON.parse(raw) as ReportRecord;
    report.status = status;
    await this.redisService.set(REPORT_KEY(reportId), JSON.stringify(report));
    this.logger.log(`report status updated id=${reportId} status=${status}`);
    return report;
  }
}
