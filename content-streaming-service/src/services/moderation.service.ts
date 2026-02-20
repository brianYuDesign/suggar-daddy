import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content, ModerationStatus } from '@/entities/content.entity';
import { ModerationLog, ModerationAction } from '@/entities/moderation-log.entity';

export interface ModerationHistoryItem {
  id: string;
  content_id: string;
  action: ModerationAction;
  reason?: string;
  performed_by: string;
  created_at: Date;
}

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(ModerationLog)
    private moderationLogRepository: Repository<ModerationLog>,
  ) {}

  /**
   * Get content pending review (pending or flagged status)
   */
  async getPendingContent(
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ data: Content[]; total: number }> {
    const [data, total] = await this.contentRepository.findAndCount({
      where: [
        { moderation_status: ModerationStatus.PENDING },
        { moderation_status: ModerationStatus.FLAGGED },
      ],
      order: {
        report_count: 'DESC',
        created_at: 'ASC',
      },
      take: limit,
      skip: offset,
    });

    return { data, total };
  }

  /**
   * Approve content
   */
  async approveContent(
    contentId: string,
    adminId: string,
    reason?: string,
  ): Promise<Content> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    if (content.moderation_status === ModerationStatus.APPROVED) {
      throw new BadRequestException('Content is already approved');
    }

    // Update content status
    content.moderation_status = ModerationStatus.APPROVED;
    content.moderation_reason = reason || null;
    content.moderated_by = adminId;
    content.moderated_at = new Date();
    content.report_count = 0; // Reset report count on approval

    const savedContent = await this.contentRepository.save(content);

    // Create moderation log
    await this.createModerationLog(contentId, ModerationAction.APPROVE, adminId, reason);

    return savedContent;
  }

  /**
   * Reject content
   */
  async rejectContent(
    contentId: string,
    adminId: string,
    reason: string,
  ): Promise<Content> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    if (content.moderation_status === ModerationStatus.REJECTED) {
      throw new BadRequestException('Content is already rejected');
    }

    // Update content status
    content.moderation_status = ModerationStatus.REJECTED;
    content.moderation_reason = reason;
    content.moderated_by = adminId;
    content.moderated_at = new Date();
    content.is_published = false; // Unpublish rejected content

    const savedContent = await this.contentRepository.save(content);

    // Create moderation log
    await this.createModerationLog(contentId, ModerationAction.REJECT, adminId, reason);

    return savedContent;
  }

  /**
   * Get content with reports (flagged or high report count)
   */
  async getReports(
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ data: Content[]; total: number }> {
    const [data, total] = await this.contentRepository.findAndCount({
      where: [
        { moderation_status: ModerationStatus.FLAGGED },
        { report_count: 1 }, // Content with at least 1 report
      ],
      order: {
        report_count: 'DESC',
        created_at: 'DESC',
      },
      take: limit,
      skip: offset,
    });

    return { data, total };
  }

  /**
   * Flag content (can be done by users or system)
   */
  async flagContent(
    contentId: string,
    reason?: string,
    reporterId?: string,
  ): Promise<Content> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    // Increment report count
    content.report_count += 1;

    // Auto-flag if report count reaches threshold (e.g., 3)
    if (content.report_count >= 3 && content.moderation_status !== ModerationStatus.FLAGGED) {
      content.moderation_status = ModerationStatus.FLAGGED;
    }

    const savedContent = await this.contentRepository.save(content);

    // Create moderation log if reporter is provided
    if (reporterId) {
      await this.createModerationLog(contentId, ModerationAction.FLAG, reporterId, reason);
    }

    return savedContent;
  }

  /**
   * Unflag content (admin only)
   */
  async unflagContent(
    contentId: string,
    adminId: string,
    reason?: string,
  ): Promise<Content> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    if (content.moderation_status !== ModerationStatus.FLAGGED) {
      throw new BadRequestException('Content is not flagged');
    }

    // Update content status back to pending for re-review
    content.moderation_status = ModerationStatus.PENDING;
    content.moderation_reason = reason || null;

    const savedContent = await this.contentRepository.save(content);

    // Create moderation log
    await this.createModerationLog(contentId, ModerationAction.UNFLAG, adminId, reason);

    return savedContent;
  }

  /**
   * Get moderation history for a content
   */
  async getModerationHistory(contentId: string): Promise<ModerationHistoryItem[]> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    const logs = await this.moderationLogRepository.find({
      where: { content_id: contentId },
      order: { created_at: 'DESC' },
    });

    return logs.map((log) => ({
      id: log.id,
      content_id: log.content_id,
      action: log.action,
      reason: log.reason,
      performed_by: log.performed_by,
      created_at: log.created_at,
    }));
  }

  /**
   * Create a moderation log entry
   */
  private async createModerationLog(
    contentId: string,
    action: ModerationAction,
    performedBy: string,
    reason?: string,
  ): Promise<ModerationLog> {
    const log = this.moderationLogRepository.create({
      content_id: contentId,
      action,
      performed_by: performedBy,
      reason: reason || null,
    });

    return this.moderationLogRepository.save(log);
  }
}
