import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { SendNotificationDto } from '@suggar-daddy/dto';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  /** 發送推播（內部或 Kafka 消費者呼叫） */
  @Post('send')
  async send(@Body() body: SendNotificationDto) {
    this.logger.log(
      `send userId=${body.userId} type=${body.type} title=${body.title}`
    );
    const notification = await this.notificationService.send(body);
    return notification;
  }

  /** 取得用戶通知列表 */
  @Get('list')
  async list(
    @Query('userId') userId: string,
    @Query('limit') limit = '20',
    @Query('unreadOnly') unreadOnly?: string
  ) {
    const uid = userId || 'mock-user-id';
    this.logger.log(`list userId=${uid} limit=${limit} unreadOnly=${unreadOnly}`);
    const list = await this.notificationService.list(
      uid,
      parseInt(limit, 10) || 20,
      unreadOnly === 'true'
    );
    return list;
  }

  /** 標記已讀 */
  @Post('read/:id')
  async markRead(
    @Param('id') id: string,
    @Query('userId') userId: string
  ) {
    const uid = userId || 'mock-user-id';
    this.logger.log(`markRead userId=${uid} id=${id}`);
    return this.notificationService.markRead(uid, id);
  }
}
