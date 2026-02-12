import { TypeOrmModuleOptions } from '@nestjs/typeorm';

interface BaseConnectionOptions {
  username: string;
  password: string;
  database: string;
  ssl: boolean | { rejectUnauthorized: boolean };
}

function getBaseConnectionOptions(): BaseConnectionOptions {
  const isProd = process.env['NODE_ENV'] === 'production';

  if (isProd) {
    if (!process.env['DB_USERNAME'] || !process.env['DB_PASSWORD']) {
      throw new Error('DB_USERNAME and DB_PASSWORD environment variables are required in production');
    }
  }

  return {
    username: process.env['DB_USERNAME'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'postgres',
    database: process.env['DB_DATABASE'] ?? 'suggar_daddy',
    ssl: isProd ? { rejectUnauthorized: false } : false,
  };
}

/** 效能調優：連線池大小（可透過 env 覆寫） */
function getPoolOptions(): { max?: number; min?: number; idleTimeoutMillis?: number } {
  return {
    max: parseInt(process.env['DB_POOL_MAX'] ?? '20', 10) || 20,
    min: parseInt(process.env['DB_POOL_MIN'] ?? '5', 10) || 5,
    idleTimeoutMillis: parseInt(process.env['DB_POOL_IDLE_TIMEOUT_MS'] ?? '30000', 10) || 30000,
  };
}

/**
 * 取得 TypeORM 資料庫設定。
 * - 若設定 DB_MASTER_HOST 或 DB_REPLICA_HOSTS，則啟用讀寫分離（replication）。
 * - 否則使用單一 DB_HOST 連線。
 * - 一律套用 connection pool 與效能相關選項。
 */
export function getDatabaseConfig(entities: any[]): TypeOrmModuleOptions {
  const base = getBaseConnectionOptions();
  const pool = getPoolOptions();
  const masterHost = process.env['DB_MASTER_HOST'];
  const replicaHosts = process.env['DB_REPLICA_HOSTS']
    ? process.env['DB_REPLICA_HOSTS'].split(',').map((h) => h.trim()).filter(Boolean)
    : [];

  const port = parseInt(process.env['DB_PORT'] ?? '5432', 10) || 5432;

  // 讀寫分離：有 Master 且至少一個 Replica 時使用 replication
  if (masterHost && replicaHosts.length > 0) {
    return {
      type: 'postgres',
      replication: {
        master: {
          host: masterHost,
          port: parseInt(process.env['DB_MASTER_PORT'] ?? String(port), 10) || port,
          ...base,
        },
        slaves: replicaHosts.map((host, i) => {
          const replicaPortEnv = process.env[`DB_REPLICA${i}_PORT`];
          return {
            host,
            port: replicaPortEnv ? parseInt(replicaPortEnv, 10) : port,
            ...base,
          };
        }),
      },
      entities,
      synchronize: process.env['NODE_ENV'] === 'development',
      logging: process.env['NODE_ENV'] === 'development',
      extra: {
        ...pool,
        connectionTimeoutMillis: parseInt(process.env['DB_CONNECT_TIMEOUT_MS'] ?? '5000', 10) || 5000,
      },
    } as TypeOrmModuleOptions;
  }

  // 單一連線（或僅 Master 無 Replica）
  const host = masterHost || process.env['DB_HOST'] || 'localhost';
  const singlePort = masterHost
    ? parseInt(process.env['DB_MASTER_PORT'] ?? String(port), 10) || port
    : port;

  return {
    type: 'postgres',
    host,
    port: singlePort,
    username: base.username,
    password: base.password,
    database: base.database,
    ssl: base.ssl,
    entities,
    synchronize: process.env['NODE_ENV'] === 'development',
    logging: process.env['NODE_ENV'] === 'development',
    extra: {
      ...pool,
      connectionTimeoutMillis: parseInt(process.env['DB_CONNECT_TIMEOUT_MS'] ?? '5000', 10) || 5000,
    },
  };
}
