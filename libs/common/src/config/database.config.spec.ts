import { getDatabaseConfig } from './database.config';

describe('getDatabaseConfig', () => {
  const entities = [{ name: 'TestEntity' }];
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns single connection when no replication env', () => {
    process.env['DB_HOST'] = 'db.local';
    process.env['DB_PORT'] = '5433';
    const config = getDatabaseConfig(entities as any) as any;
    expect(config).toHaveProperty('type', 'postgres');
    expect(config).toHaveProperty('host', 'db.local');
    expect(config).toHaveProperty('port', 5433);
    expect(config).not.toHaveProperty('replication');
    expect(config.extra).toBeDefined();
    expect(config.extra?.max).toBeDefined();
  });

  it('returns replication config when DB_MASTER_HOST and DB_REPLICA_HOSTS set', () => {
    process.env['DB_MASTER_HOST'] = 'master.local';
    process.env['DB_REPLICA_HOSTS'] = 'replica1.local,replica2.local';
    process.env['DB_USERNAME'] = 'u';
    process.env['DB_PASSWORD'] = 'p';
    process.env['DB_DATABASE'] = 'db';
    const config = getDatabaseConfig(entities as any) as any;
    expect(config.type).toBe('postgres');
    expect(config.replication).toBeDefined();
    expect(config.replication.master.host).toBe('master.local');
    expect(config.replication.slaves).toHaveLength(2);
    expect(config.replication.slaves[0].host).toBe('replica1.local');
    expect(config.replication.slaves[1].host).toBe('replica2.local');
  });

  it('uses default host and port when env not set', () => {
    delete process.env['DB_HOST'];
    delete process.env['DB_PORT'];
    const config = getDatabaseConfig(entities as any) as any;
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
  });
});
