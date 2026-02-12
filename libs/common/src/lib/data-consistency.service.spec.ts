import { Test, TestingModule } from "@nestjs/testing";
import {
  DataConsistencyService,
  InconsistencyType,
} from "./data-consistency.service";
import { RedisService } from "@suggar-daddy/redis";
import { DataSource, Repository } from "typeorm";

// Mock Entity
class MockUser {
  id!: string;
  username!: string;
  email!: string;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

describe("DataConsistencyService", () => {
  let service: DataConsistencyService;
  let redisService: jest.Mocked<RedisService>;
  let dataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<MockUser>>;

  beforeEach(async () => {
    // Mock Redis Client
    const mockRedisClient = {
      scan: jest.fn(),
    };

    // Mock RedisService
    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    } as any;

    // Mock Repository
    mockRepository = {
      find: jest.fn(),
    } as any;

    // Mock DataSource
    dataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataConsistencyService,
        { provide: RedisService, useValue: redisService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<DataConsistencyService>(DataConsistencyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkConsistency", () => {
    it("應該檢測 REDIS_ONLY 不一致（Redis 有但 DB 沒有）", async () => {
      // Arrange
      const config = {
        entityName: "User",
        redisKeyPrefix: "user:",
        entityClass: MockUser,
      };

      // DB 中只有一個用戶
      const dbUsers = [
        {
          id: "1",
          username: "alice",
          email: "alice@example.com",
          status: "active",
        },
      ];
      mockRepository.find.mockResolvedValue(dbUsers as any);

      // Redis 中有兩個用戶
      const mockRedisClient = redisService.getClient();
      mockRedisClient.scan
        .mockResolvedValueOnce(["0", ["user:1", "user:2"]])
        .mockResolvedValueOnce(["0", []]);

      redisService.get
        .mockResolvedValueOnce(JSON.stringify({ id: "1", username: "alice" }))
        .mockResolvedValueOnce(JSON.stringify({ id: "2", username: "bob" }));

      // Act
      const inconsistencies = await service.checkConsistency(config);

      // Assert
      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0]).toMatchObject({
        entityType: "User",
        entityId: "2",
        type: InconsistencyType.REDIS_ONLY,
      });
      expect(inconsistencies[0].redisValue).toEqual({
        id: "2",
        username: "bob",
      });
      expect(inconsistencies[0].dbValue).toBeNull();
    });

    it("應該檢測 DB_ONLY 不一致（DB 有但 Redis 沒有）", async () => {
      // Arrange
      const config = {
        entityName: "User",
        redisKeyPrefix: "user:",
        entityClass: MockUser,
      };

      // DB 中有兩個用戶
      const dbUsers = [
        { id: "1", username: "alice", email: "alice@example.com" },
        { id: "2", username: "bob", email: "bob@example.com" },
      ];
      mockRepository.find.mockResolvedValue(dbUsers as any);

      // Redis 中只有一個用戶
      const mockRedisClient = redisService.getClient();
      mockRedisClient.scan
        .mockResolvedValueOnce(["0", ["user:1"]])
        .mockResolvedValueOnce(["0", []]);

      redisService.get.mockResolvedValueOnce(
        JSON.stringify({ id: "1", username: "alice" }),
      );

      // Act
      const inconsistencies = await service.checkConsistency(config);

      // Assert
      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0]).toMatchObject({
        entityType: "User",
        entityId: "2",
        type: InconsistencyType.DB_ONLY,
      });
      expect(inconsistencies[0].redisValue).toBeNull();
      expect(inconsistencies[0].dbValue).toEqual(dbUsers[1]);
    });

    it("應該檢測 DATA_MISMATCH 不一致（數據不匹配）", async () => {
      // Arrange
      const config = {
        entityName: "User",
        redisKeyPrefix: "user:",
        entityClass: MockUser,
        fieldsToCompare: ["username", "email"],
      };

      // DB 中的數據
      const dbUsers = [
        { id: "1", username: "alice_new", email: "alice_new@example.com" },
      ];
      mockRepository.find.mockResolvedValue(dbUsers as any);

      // Redis 中的數據（舊數據）
      const mockRedisClient = redisService.getClient();
      mockRedisClient.scan
        .mockResolvedValueOnce(["0", ["user:1"]])
        .mockResolvedValueOnce(["0", []]);

      redisService.get.mockResolvedValueOnce(
        JSON.stringify({
          id: "1",
          username: "alice_old",
          email: "alice_old@example.com",
        }),
      );

      // Act
      const inconsistencies = await service.checkConsistency(config);

      // Assert
      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0]).toMatchObject({
        entityType: "User",
        entityId: "1",
        type: InconsistencyType.DATA_MISMATCH,
      });
      expect(inconsistencies[0].redisValue.username).toBe("alice_old");
      expect(inconsistencies[0].dbValue.username).toBe("alice_new");
    });

    it("應該在啟用 autoFix 時自動修復不一致", async () => {
      // Arrange
      const config = {
        entityName: "User",
        redisKeyPrefix: "user:",
        entityClass: MockUser,
        autoFix: true,
      };

      const dbUsers = [
        { id: "1", username: "alice", email: "alice@example.com" },
      ];
      mockRepository.find.mockResolvedValue(dbUsers as any);

      const mockRedisClient = redisService.getClient();
      mockRedisClient.scan
        .mockResolvedValueOnce(["0", ["user:2"]]) // Redis 有但 DB 沒有
        .mockResolvedValueOnce(["0", []]);

      redisService.get.mockResolvedValueOnce(
        JSON.stringify({ id: "2", username: "bob" }),
      );

      // Act
      const inconsistencies = await service.checkConsistency(config);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith("user:2"); // 應該刪除孤立數據
      expect(inconsistencies[0].fixed).toBe(true);
    });

    it("應該在數據完全一致時返回空數組", async () => {
      // Arrange
      const config = {
        entityName: "User",
        redisKeyPrefix: "user:",
        entityClass: MockUser,
      };

      const dbUsers = [
        {
          id: "1",
          username: "alice",
          email: "alice@example.com",
          status: "active",
        },
      ];
      mockRepository.find.mockResolvedValue(dbUsers as any);

      const mockRedisClient = redisService.getClient();
      mockRedisClient.scan
        .mockResolvedValueOnce(["0", ["user:1"]])
        .mockResolvedValueOnce(["0", []]);

      redisService.get.mockResolvedValueOnce(
        JSON.stringify({
          id: "1",
          username: "alice",
          email: "alice@example.com",
          status: "active",
        }),
      );

      // Act
      const inconsistencies = await service.checkConsistency(config);

      // Assert
      expect(inconsistencies).toHaveLength(0);
    });

    it("應該忽略 createdAt 和 updatedAt 欄位的差異", async () => {
      // Arrange
      const config = {
        entityName: "User",
        redisKeyPrefix: "user:",
        entityClass: MockUser,
      };

      const dbUsers = [
        {
          id: "1",
          username: "alice",
          email: "alice@example.com",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-02"),
        },
      ];
      mockRepository.find.mockResolvedValue(dbUsers as any);

      const mockRedisClient = redisService.getClient();
      mockRedisClient.scan
        .mockResolvedValueOnce(["0", ["user:1"]])
        .mockResolvedValueOnce(["0", []]);

      // Redis 中的時間戳不同
      redisService.get.mockResolvedValueOnce(
        JSON.stringify({
          id: "1",
          username: "alice",
          email: "alice@example.com",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-03"), // 不同的 updatedAt
        }),
      );

      // Act
      const inconsistencies = await service.checkConsistency(config);

      // Assert
      expect(inconsistencies).toHaveLength(0); // 應該忽略 updatedAt 差異
    });
  });

  describe("fixInconsistency", () => {
    it("應該修復 REDIS_ONLY 不一致（刪除 Redis 中的孤立數據）", async () => {
      // Arrange
      const inconsistency = {
        entityType: "User",
        entityId: "2",
        type: InconsistencyType.REDIS_ONLY,
        redisValue: { id: "2", username: "bob" },
        dbValue: null,
        detectedAt: new Date(),
        fixed: false,
      };

      const config = {
        entityName: "User",
        redisKeyPrefix: "user:",
        entityClass: MockUser,
      };

      // Act
      const result = await service.fixInconsistency(inconsistency, config);

      // Assert
      expect(result).toBe(true);
      expect(redisService.del).toHaveBeenCalledWith("user:2");
      expect(inconsistency.fixed).toBe(true);
    });

    it("應該修復 DB_ONLY 不一致（從 DB 同步到 Redis）", async () => {
      // Arrange
      const inconsistency = {
        entityType: "User",
        entityId: "2",
        type: InconsistencyType.DB_ONLY,
        redisValue: null,
        dbValue: { id: "2", username: "bob", email: "bob@example.com" },
        detectedAt: new Date(),
        fixed: false,
      };

      const config = {
        entityName: "User",
        redisKeyPrefix: "user:",
        entityClass: MockUser,
      };

      // Act
      const result = await service.fixInconsistency(inconsistency, config);

      // Assert
      expect(result).toBe(true);
      expect(redisService.set).toHaveBeenCalledWith(
        "user:2",
        JSON.stringify({ id: "2", username: "bob", email: "bob@example.com" }),
      );
      expect(inconsistency.fixed).toBe(true);
    });

    it("應該修復 DATA_MISMATCH 不一致（用 DB 數據覆蓋 Redis）", async () => {
      // Arrange
      const inconsistency = {
        entityType: "User",
        entityId: "1",
        type: InconsistencyType.DATA_MISMATCH,
        redisValue: { id: "1", username: "alice_old" },
        dbValue: { id: "1", username: "alice_new", email: "alice@example.com" },
        detectedAt: new Date(),
        fixed: false,
      };

      const config = {
        entityName: "User",
        redisKeyPrefix: "user:",
        entityClass: MockUser,
      };

      // Act
      const result = await service.fixInconsistency(inconsistency, config);

      // Assert
      expect(result).toBe(true);
      expect(redisService.set).toHaveBeenCalledWith(
        "user:1",
        JSON.stringify({
          id: "1",
          username: "alice_new",
          email: "alice@example.com",
        }),
      );
      expect(inconsistency.fixed).toBe(true);
    });
  });

  describe("getStatistics", () => {
    it("應該返回正確的統計信息", () => {
      // Arrange
      const inconsistencies = [
        {
          entityType: "User",
          entityId: "1",
          type: InconsistencyType.REDIS_ONLY,
          redisValue: {},
          dbValue: null,
          detectedAt: new Date(),
          fixed: true,
        },
        {
          entityType: "User",
          entityId: "2",
          type: InconsistencyType.DB_ONLY,
          redisValue: null,
          dbValue: {},
          detectedAt: new Date(),
          fixed: false,
        },
        {
          entityType: "User",
          entityId: "3",
          type: InconsistencyType.DATA_MISMATCH,
          redisValue: {},
          dbValue: {},
          detectedAt: new Date(),
          fixed: false,
        },
      ];

      // 手動設置不一致記錄（因為沒有 setter）
      (service as any).inconsistencies = inconsistencies;

      // Act
      const stats = service.getStatistics();

      // Assert
      expect(stats).toEqual({
        total: 3,
        fixed: 1,
        pending: 2,
        byType: {
          REDIS_ONLY: 1,
          DB_ONLY: 1,
          DATA_MISMATCH: 1,
        },
      });
    });
  });

  describe("clearInconsistencies", () => {
    it("應該清除所有不一致記錄", () => {
      // Arrange
      (service as any).inconsistencies = [
        {
          entityType: "User",
          entityId: "1",
          type: InconsistencyType.REDIS_ONLY,
        },
      ];

      // Act
      service.clearInconsistencies();

      // Assert
      expect(service.getInconsistencies()).toHaveLength(0);
    });
  });
});
