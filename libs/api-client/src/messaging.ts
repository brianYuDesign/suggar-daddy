import type { ApiClient } from './client';
import type {
  SendMessageDto,
  MessageDto,
  ConversationDto,
} from '@suggar-daddy/dto';

export class MessagingApi {
  constructor(private readonly client: ApiClient) {}

  getConversations() {
    return this.client.get<ConversationDto[]>('/api/v1/messaging/conversations');
  }

  getMessages(conversationId: string, cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<MessageDto[]>(
      `/api/v1/messaging/conversations/${conversationId}/messages`,
      { params }
    );
  }

  sendMessage(dto: SendMessageDto) {
    return this.client.post<MessageDto>('/api/v1/messaging/messages', dto);
  }
}
