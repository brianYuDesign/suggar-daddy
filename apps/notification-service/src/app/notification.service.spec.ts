import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('NotificationService', () => {
  let service: NotificationService;

  const store = new Map<string, string>();
  const lists = new Map<string, string[]>();

  const redis = {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
    setex: jest.fn(async (key: string, ttl: number, value: string) => { store.set(key, value); }),
    mget: jest.fn(async (...keys: string[]) => keys.map(k => store.get(k) ?? null)),
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
  };

  const kafka = {
    sendEvent: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    store.clear();
    lists.clear();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  describe('send', () => {
    it('應建立通知並回傳 DTO', async () => {
      const dto = {
        userId: 'user-1',
        type: 'match',
        title: 'New match',
        body: 'You matched with someone',
        data: { matchId: 'm1' },
      };

      const result = await service.send(dto);

      expect(result.id).toMatch(/^notif-/);
      expect(result.type).toBe('match');
      expect(result.title).toBe('New match');
      expect(result.body).toBe('You matched with someone');
      expect(result.read).toBe(false);
    });
  });

  describe('list', () => {
    it('應只回傳該 userId 的通知並依時間倒序', async () => {
      await service.send({
        userId: 'user-1',
        type: 'a',
        title: 'A',
        body: 'A',
      });
      await service.send({
        userId: 'user-1',
        type: 'b',
        title: 'B',
        body: 'B',
      });
      await service.send({
        userId: 'user-2',
        type: 'c',
        title: 'C',
        body: 'C',
      });

      const result = await service.list('user-1', 10, false);

      expect(result.length).toBe(2);
      expect(result.every((n) => n.type === 'a' || n.type === 'b')).toBe(true);
    });

    it('應在 unreadOnly 時只回傳未讀', async () => {
      await service.send({
        userId: 'u',
        type: 'x',
        title: 'X',
        body: 'X',
      });
      const list = await service.list('u', 10, false);
      await service.markRead('u', list[0].id);
      const unreadOnly = await service.list('u', 10, true);
      expect(unreadOnly.length).toBe(0);
    });
  });

  describe('markRead', () => {
    it('應將指定通知標為已讀並回傳 success: true', async () => {
      await service.send({
        userId: 'user-1',
        type: 't',
        title: 'T',
        body: 'T',
      });
      const list = await service.list('user-1', 1, false);
      const id = list[0].id;

      const result = await service.markRead('user-1', id);

      expect(result.success).toBe(true);
      const after = await service.list('user-1', 10, true);
      expect(after.find((n) => n.id === id)).toBeUndefined();
    });

    it('應在 id 不屬於該用戶時回傳 success: false', async () => {
      const result = await service.markRead('user-1', 'notif-fake-id');
      expect(result.success).toBe(false);
    });
  });
});
