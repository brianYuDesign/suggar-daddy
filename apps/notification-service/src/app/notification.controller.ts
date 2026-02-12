import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SendNotificationDto } from '@suggar-daddy/dto';
import { JwtAuthGuard, CurrentUser, Public, Roles, UserRole } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  /** 發送推播（僅限 Admin） */
  @Post('send')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async send(@Body() body: SendNotificationDto) {
    this.logger.log(
      `send userId=${body.userId} type=${body.type} title=${body.title}`
    );
    const notification = await this.notificationService.send(body);
    return notification;
  }

  /** 取得當前用戶通知列表（JWT） */
  @Get('list')
  @UseGuards(JwtAuthGuard)
  async list(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit = '20',
    @Query('unreadOnly') unreadOnly?: string
  ) {
    const uid = user.userId;
    this.logger.log(`list userId=${uid} limit=${limit} unreadOnly=${unreadOnly}`);
    return this.notificationService.list(
      uid,
      parseInt(limit, 10) || 20,
      unreadOnly === 'true'
    );
  }

  /** 標記當前用戶的某則通知已讀（JWT） */
  @Post('read/:id')
  @UseGuards(JwtAuthGuard)
  async markRead(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string
  ) {
    const uid = user.userId;
    this.logger.log(`markRead userId=${uid} id=${id}`);
    return this.notificationService.markRead(uid, id);
  }
}
