import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { SubscriptionServiceClient } from './subscription-service.client';

describe('MessagingService', () => {
  let service: MessagingService;

  const store = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const sets = new Map<string, Set<string>>();

  const redis = {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
    lPush: jest.fn(async (key: string, value: string) => {
      const arr = lists.get(key) ?? [];
      arr.push(value);
      lists.set(key, arr);
      return arr.length;
    }),
    lRange: jest.fn(async (key: string, start: number, end: number) => {
      const arr = lists.get(key) ?? [];
      return arr.slice(start, end === -1 ? undefined : end + 1);
    }),
    lLen: jest.fn(async (key: string) => (lists.get(key) ?? []).length),
    sAdd: jest.fn(async (key: string, ...members: string[]) => {
      const s = sets.get(key) ?? new Set<string>();
      let added = 0;
      for (const m of members) { if (!s.has(m)) { s.add(m); added++; } }
      sets.set(key, s);
      return added;
    }),
    sMembers: jest.fn(async (key: string) => [...(sets.get(key) ?? [])]),
    sIsMember: jest.fn(async (key: string, member: string) => (sets.get(key) ?? new Set()).has(member)),
    mget: jest.fn(async (...keys: string[]) => keys.map((k) => store.get(k) ?? null)),
  };

  const kafka = {
    sendEvent: jest.fn().mockResolvedValue(null),
  };

  const subscriptionServiceClient = {
    checkSubscriptionAccess: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    store.clear();
    lists.clear();
    sets.clear();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
        { provide: SubscriptionServiceClient, useValue: subscriptionServiceClient },
      ],
    }).compile();

    service = module.get(MessagingService);
  });

  describe('ensureConversation', () => {
    it('應建立新對話並回傳 conversationId', async () => {
      const id = await service.ensureConversation('user-a', 'user-b');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      const id2 = await service.ensureConversation('user-b', 'user-a');
      expect(id2).toBe(id);
    });
  });

  describe('send', () => {
    it('應儲存訊息並回傳 DTO', async () => {
      const convId = await service.ensureConversation('u1', 'u2');

      const result = await service.send('u1', convId, 'Hello');

      expect(result.id).toMatch(/^msg-/);
      expect(result.conversationId).toBe(convId);
      expect(result.senderId).toBe('u1');
      expect(result.content).toBe('Hello');
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('isParticipant', () => {
    it('應在用戶為參與者時回傳 true', async () => {
      const convId = await service.ensureConversation('u1', 'u2');
      await expect(service.isParticipant(convId, 'u1')).resolves.toBe(true);
      await expect(service.isParticipant(convId, 'u2')).resolves.toBe(true);
    });

    it('應在用戶非參與者時回傳 false', async () => {
      const convId = await service.ensureConversation('u1', 'u2');
      await expect(service.isParticipant(convId, 'u3')).resolves.toBe(false);
      await expect(service.isParticipant('unknown-conv', 'u1')).resolves.toBe(false);
    });
  });

  describe('getMessages', () => {
    it('應在非參與者時回傳空 messages', async () => {
      const convId = await service.ensureConversation('u1', 'u2');
      const result = await service.getMessages('u3', convId, 10);
      expect(result.messages).toEqual([]);
    });

    it('應回傳該對話的訊息並支援 cursor', async () => {
      const convId = await service.ensureConversation('u1', 'u2');
      await service.send('u1', convId, 'First');
      await service.send('u1', convId, 'Second');

      const page1 = await service.getMessages('u1', convId, 1);
      expect(page1.messages.length).toBe(1);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await service.getMessages('u1', convId, 5, page1.nextCursor);
      expect(page2.messages.length).toBe(1);
    });
  });

  describe('getConversations', () => {
    it('應回傳用戶參與的對話列表', async () => {
      const c1 = await service.ensureConversation('u1', 'u2');
      await service.send('u1', c1, 'Hi');
      const list = await service.getConversations('u1');
      expect(list.length).toBe(1);
      expect(list[0].participantIds).toContain('u1');
      expect(list[0].participantIds).toContain('u2');
    });
  });
});
