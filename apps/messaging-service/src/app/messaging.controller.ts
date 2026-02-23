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
import { SendMessageDto, SendBroadcastDto, MarkReadDto } from '@suggar-daddy/dto';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { InjectLogger } from '@suggar-daddy/common';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';

@Controller()
export class MessagingController {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly messagingService: MessagingService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  /** 發送訊息（僅限對話參與者） */
  @Post('send')
  @UseGuards(JwtAuthGuard)
  async send(
    @CurrentUser() user: CurrentUserData,
    @Body() body: SendMessageDto,
  ) {
    const senderId = user.userId;
    let canSend = await this.messagingService.isParticipant(
      body.conversationId,
      senderId,
    );
    // Auto-create conversation if sender is a valid participant (userId1::userId2 format)
    if (!canSend) {
      const parts = body.conversationId.split('::');
      if (parts.length === 2 && parts.includes(senderId)) {
        await this.messagingService.ensureConversation(parts[0], parts[1]);
        canSend = true;
      }
    }
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
    @Query('limit') limit = '30',
    @Query('cursor') cursor?: string,
  ) {
    const uid = user.userId;
    // Auto-ensure conversation exists for valid participants
    const parts = conversationId.split('::');
    if (parts.length === 2 && parts.includes(uid)) {
      await this.messagingService.ensureConversation(parts[0], parts[1]);
    }
    this.logger.log(
      `messages userId=${uid} conversationId=${conversationId} limit=${limit}`,
    );
    return this.messagingService.getMessages(
      uid,
      conversationId,
      parseInt(limit, 10) || 30,
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

  /** 使用鑽石解鎖 DM 權限 */
  @Post('conversations/:conversationId/unlock-dm')
  @UseGuards(JwtAuthGuard)
  async unlockDm(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string,
  ) {
    this.logger.log(
      `unlockDm userId=${user.userId} conversationId=${conversationId}`,
    );
    return this.messagingService.unlockDmAccess(
      user.userId,
      conversationId,
    );
  }

  /** 取得聊天狀態（是否需要鑽石解鎖） */
  @Get('conversations/:conversationId/chat-status')
  @UseGuards(JwtAuthGuard)
  async getChatStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.getChatStatus(user.userId, conversationId);
  }

  /** 標記已讀 */
  @Post('conversations/:conversationId/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string,
    @Body() body: MarkReadDto,
  ) {
    this.logger.log(
      `markAsRead userId=${user.userId} conversationId=${conversationId}`,
    );
    await this.messagingService.markAsRead(
      user.userId,
      conversationId,
      body.messageId,
    );
    return { success: true };
  }

  /** 取得對話已讀回執 */
  @Get('conversations/:conversationId/read-receipts')
  @UseGuards(JwtAuthGuard)
  async getReadReceipts(
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.getReadReceipts(conversationId);
  }

  /** 取得用戶在線狀態 */
  @Get('online-status')
  @UseGuards(JwtAuthGuard)
  async getOnlineStatus(@Query('userIds') userIds: string) {
    const ids = userIds ? userIds.split(',').filter(Boolean) : [];
    const onlineSet = new Set(await this.messagingGateway.getOnlineUsers());
    const result: Record<string, boolean> = {};
    for (const id of ids) {
      result[id] = onlineSet.has(id);
    }
    return result;
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
