import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { DlqService } from './dlq.service';

/**
 * 死信佇列管理控制器
 * 提供 DLQ 訊息的查詢、重試、刪除等管理功能
 */
@Controller('dlq')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DlqController {
  private readonly logger = new Logger(DlqController.name);

  constructor(private readonly dlqService: DlqService) {}

  /**
   * 取得死信佇列訊息列表
   * GET /dlq/messages?limit=50&offset=0
   */
  @Get('messages')
  async listMessages(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    this.logger.log(
      '查詢死信佇列訊息列表: limit=' + parsedLimit + ', offset=' + parsedOffset,
    );

    const messages = await this.dlqService.listMessages(parsedLimit, parsedOffset);
    return {
      data: messages,
      limit: parsedLimit,
      offset: parsedOffset,
      count: messages.length,
    };
  }

  /**
   * 取得單一死信訊息詳情
   * GET /dlq/messages/:id
   */
  @Get('messages/:id')
  async getMessage(@Param('id') id: string) {
    this.logger.log('查詢死信訊息詳情: id=' + id);

    const message = await this.dlqService.getMessage(id);
    if (!message) {
      throw new HttpException(
        '找不到死信訊息: id=' + id,
        HttpStatus.NOT_FOUND,
      );
    }
    return message;
  }

  /**
   * 重試單一死信訊息
   * POST /dlq/messages/:id/retry
   */
  @Post('messages/:id/retry')
  async retryMessage(@Param('id') id: string) {
    this.logger.log('重試死信訊息: id=' + id);

    const success = await this.dlqService.retryMessage(id);
    if (!success) {
      throw new HttpException(
        '重試失敗：找不到訊息或發送失敗, id=' + id,
        HttpStatus.BAD_REQUEST,
      );
    }

    return { message: '訊息已重新發送', id };
  }

  /**
   * 重試所有死信佇列中的訊息
   * POST /dlq/retry-all
   */
  @Post('retry-all')
  async retryAll() {
    this.logger.log('批次重試所有死信佇列訊息');

    const result = await this.dlqService.retryAll();
    return {
      message: '批次重試完成',
      ...result,
    };
  }

  /**
   * 刪除單一死信訊息
   * DELETE /dlq/messages/:id
   */
  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string) {
    this.logger.log('刪除死信訊息: id=' + id);

    const success = await this.dlqService.deleteMessage(id);
    if (!success) {
      throw new HttpException(
        '找不到死信訊息: id=' + id,
        HttpStatus.NOT_FOUND,
      );
    }

    return { message: '訊息已刪除', id };
  }

  /**
   * 清除所有死信佇列訊息
   * DELETE /dlq/purge
   */
  @Delete('purge')
  async purgeAll() {
    this.logger.log('清除所有死信佇列訊息');

    const count = await this.dlqService.purgeAll();
    return {
      message: '已清除所有死信佇列訊息',
      deletedCount: count,
    };
  }

  /**
   * 取得死信佇列統計資訊
   * GET /dlq/stats
   */
  @Get('stats')
  async getStats() {
    this.logger.log('查詢死信佇列統計資訊');

    const stats = await this.dlqService.getStats();
    return stats;
  }
}
