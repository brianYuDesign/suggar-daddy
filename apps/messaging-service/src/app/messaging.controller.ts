import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SendMessageDto, SendBroadcastDto } from '@suggar-daddy/dto';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { InjectLogger } from '@suggar-daddy/common';
import { MessagingService } from './messaging.service';

@Controller()
export class MessagingController {
  @InjectLogger() private readonly logger!: Logger;

  constructor(private readonly messagingService: MessagingService) {}

  /** 發送訊息（僅限對話參與者） */
  @Post('send')
  @UseGuards(JwtAuthGuard)
  async send(
    @CurrentUser() user: CurrentUserData,
    @Body() body: SendMessageDto,
  ) {
    const senderId = user.userId;
    const canSend = await this.messagingService.isParticipant(
      body.conversationId,
      senderId,
    );
    if (!canSend) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }
    this.logger.log(
      `send senderId=${senderId} conversationId=${body.conversationId}`,
    );
    return this.messagingService.send(
      senderId,
      body.conversationId,
      body.content,
      body.attachments,
    );
  }

  /** 取得當前用戶對話列表（JWT） */
  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async getConversations(@CurrentUser() user: CurrentUserData) {
    const uid = user.userId;
    this.logger.log(`conversations userId=${uid}`);
    return this.messagingService.getConversations(uid);
  }

  /** 取得對話內訊息（僅限參與者，JWT） */
  @Get('conversations/:conversationId/messages')
  @UseGuards(JwtAuthGuard)
  async getMessages(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit = '50',
    @Query('cursor') cursor?: string,
  ) {
    const uid = user.userId;
    this.logger.log(
      `messages userId=${uid} conversationId=${conversationId} limit=${limit}`,
    );
    return this.messagingService.getMessages(
      uid,
      conversationId,
      parseInt(limit, 10) || 50,
      cursor,
    );
  }

  /** 使用鑽石解鎖聊天門檻 */
  @Post('conversations/:conversationId/unlock-chat')
  @UseGuards(JwtAuthGuard)
  async unlockChat(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string,
  ) {
    this.logger.log(
      `unlockChat userId=${user.userId} conversationId=${conversationId}`,
    );
    return this.messagingService.unlockChatDiamondGate(
      user.userId,
      conversationId,
    );
  }

  /** 發送廣播訊息（創作者專用） */
  @Post('broadcast')
  @UseGuards(JwtAuthGuard)
  async sendBroadcast(
    @CurrentUser() user: CurrentUserData,
    @Body() body: SendBroadcastDto,
  ) {
    this.logger.log(`broadcast creatorId=${user.userId}`);
    return this.messagingService.sendBroadcast(
      user.userId,
      body.content,
      body.audience,
    );
  }

  /** 取得用戶收到的廣播訊息 */
  @Get('broadcasts')
  @UseGuards(JwtAuthGuard)
  async getBroadcasts(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    this.logger.log(`getBroadcasts userId=${user.userId}`);
    return this.messagingService.getBroadcasts(
      user.userId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }
}
