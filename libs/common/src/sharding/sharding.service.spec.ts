import { ShardingService } from './sharding.service';

describe('ShardingService', () => {
  const shardCount = 16;
  let service: ShardingService;

  beforeEach(() => {
    service = new ShardingService(shardCount);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.getShardCount()).toBe(shardCount);
  });

  it('getShardId returns same shard for same key', () => {
    const id1 = service.getShardId('user-123');
    const id2 = service.getShardId('user-123');
    expect(id1).toBe(id2);
  });

  it('getShardId returns value in [0, shardCount-1]', () => {
    for (const key of ['a', 'user-x', 'conv-abc', '']) {
      const id = service.getShardId(key);
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(shardCount);
    }
  });

  it('getShardId distributes different keys', () => {
    const ids = new Set<number>();
    for (let i = 0; i < 100; i++) {
      ids.add(service.getShardId(`key-${i}`));
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  it('getShardIdByUserId equals getShardId', () => {
    const userId = 'user-456';
    expect(service.getShardIdByUserId(userId)).toBe(service.getShardId(userId));
  });

  it('getShardIdByConversationId equals getShardId', () => {
    const convId = 'ua::ub';
    expect(service.getShardIdByConversationId(convId)).toBe(service.getShardId(convId));
  });

  it('returns 0 for empty key or shardCount 0', () => {
    const emptyService = new ShardingService(0);
    expect(emptyService.getShardId('any')).toBe(0);
    expect(service.getShardId('')).toBe(0);
  });
});
