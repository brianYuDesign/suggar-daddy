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
import { SendMessageDto } from '@suggar-daddy/dto';
import { JwtAuthGuard, CurrentUser } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';
import { MessagingService } from './messaging.service';

@Controller()
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(private readonly messagingService: MessagingService) {}

  /** 發送訊息（僅限對話參與者） */
  @Post('send')
  @UseGuards(JwtAuthGuard)
  async send(
    @CurrentUser() user: CurrentUserData,
    @Body() body: SendMessageDto
  ) {
    const senderId = user.userId;
    const canSend = await this.messagingService.isParticipant(body.conversationId, senderId);
    if (!canSend) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }
    this.logger.log(
      `send senderId=${senderId} conversationId=${body.conversationId}`
    );
    return this.messagingService.send(
      senderId,
      body.conversationId,
      body.content
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
    @Query('cursor') cursor?: string
  ) {
    const uid = user.userId;
    this.logger.log(
      `messages userId=${uid} conversationId=${conversationId} limit=${limit}`
    );
    return this.messagingService.getMessages(
      uid,
      conversationId,
      parseInt(limit, 10) || 50,
      cursor
    );
  }
}
