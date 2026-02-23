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
import { JwtAuthGuard, CurrentUser, Public, Roles } from '@suggar-daddy/auth';
import type { CurrentUserData } from '@suggar-daddy/auth';
import { UserRole, InjectLogger } from '@suggar-daddy/common';
import { RedisService } from '@suggar-daddy/redis';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly redis: RedisService,
  ) {}

  /** 發送推播（僅限 Admin） */
  @Post('send')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async send(@Body() body: SendNotificationDto) {
    let targetUserIds: string[] = [];

    switch (body.targetUsers) {
      case 'ALL':
        targetUserIds = await this.redis.sMembers('users:all');
        break;
      case 'CREATORS':
        targetUserIds = await this.redis.sMembers('users:creators');
        break;
      case 'SUBSCRIBERS': {
        const all = await this.redis.sMembers('users:all');
        const creators = new Set(await this.redis.sMembers('users:creators'));
        targetUserIds = all.filter(id => !creators.has(id));
        break;
      }
      case 'SPECIFIC':
        targetUserIds = body.userIds ?? [];
        break;
      default:
        targetUserIds = body.userIds ?? [];
        break;
    }

    this.logger.log(
      `send targetUsers=${body.targetUsers} count=${targetUserIds.length} type=${body.type} title=${body.title}`
    );

    // Batch send (100 at a time)
    const BATCH_SIZE = 100;
    const results = [];
    for (let i = 0; i < targetUserIds.length; i += BATCH_SIZE) {
      const batch = targetUserIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((userId) =>
          this.notificationService.send({
            userId,
            type: body.type,
            title: body.title,
            body: body.message,
            data: body.actionUrl ? { actionUrl: body.actionUrl } : undefined,
          }),
        ),
      );
      results.push(...batchResults);
    }

    return results;
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

  /** 取得未讀通知數量 */
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@CurrentUser() user: CurrentUserData) {
    const count = await this.notificationService.getUnreadCount(user.userId);
    return { count };
  }

  /** 批量標記所有通知為已讀 */
  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllRead(@CurrentUser() user: CurrentUserData) {
    return this.notificationService.markAllRead(user.userId);
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
