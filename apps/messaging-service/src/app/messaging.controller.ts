import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { SendMessageDto } from '@suggar-daddy/dto';
import { MessagingService } from './messaging.service';

@Controller()
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(private readonly messagingService: MessagingService) {}

  /** 發送訊息 */
  @Post('send')
  async send(
    @Body() body: SendMessageDto,
    @Query('userId') userId: string
  ) {
    const senderId = userId || 'mock-user-id';
    this.logger.log(
      `send senderId=${senderId} conversationId=${body.conversationId}`
    );
    const message = await this.messagingService.send(
      senderId,
      body.conversationId,
      body.content
    );
    return message;
  }

  /** 取得對話列表 */
  @Get('conversations')
  async getConversations(@Query('userId') userId: string) {
    const uid = userId || 'mock-user-id';
    this.logger.log(`conversations userId=${uid}`);
    return this.messagingService.getConversations(uid);
  }

  /** 取得對話內訊息 */
  @Get('conversations/:conversationId/messages')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('userId') userId: string,
    @Query('limit') limit = '50',
    @Query('cursor') cursor?: string
  ) {
    const uid = userId || 'mock-user-id';
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
