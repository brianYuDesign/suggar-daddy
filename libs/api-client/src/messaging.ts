import type { ApiClient } from './client';
import type {
  SendMessageDto,
  MessageDto,
  ConversationDto,
} from '@suggar-daddy/dto';

export class MessagingApi {
  constructor(private readonly client: ApiClient) {}

  getConversations() {
    return this.client.get<ConversationDto[]>('/api/messaging/conversations');
  }

  getMessages(conversationId: string, cursor?: string) {
    const params = cursor ? { cursor } : undefined;
<<<<<<< HEAD
    return this.client.get<MessageDto[]>(
      `/api/messaging/conversations/${conversationId}/messages`,
=======
    return this.client.get<{ messages: MessageDto[]; nextCursor?: string }>(
      `/api/v1/messaging/conversations/${conversationId}/messages`,
>>>>>>> a0fdce05c026d8e1406983e3732cd83732cce969
      { params }
    );
  }

  sendMessage(dto: SendMessageDto) {
    return this.client.post<MessageDto>('/api/messaging/messages', dto);
  }
}
