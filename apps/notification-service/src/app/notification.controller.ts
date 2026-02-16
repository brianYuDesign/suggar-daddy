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
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  @InjectLogger() private readonly logger!: Logger;

  constructor(private readonly notificationService: NotificationService) {}

  /** 發送推播（僅限 Admin） */
  @Post('send')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async send(@Body() body: SendNotificationDto) {
    const targetUserIds = body.userIds ?? [];
    this.logger.log(
      `send userIds=${targetUserIds.join(',')} type=${body.type} title=${body.title}`
    );
    // Send to each target user using the internal notification DTO
    const results = await Promise.all(
      targetUserIds.map((userId) =>
        this.notificationService.send({
          userId,
          type: body.type,
          title: body.title,
          body: body.message,
        }),
      ),
    );
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
