import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConsistencyService } from "./consistency.service";
import { RedisService } from "@suggar-daddy/redis";
import { UserEntity, PostEntity } from "@suggar-daddy/database";

// 建立模擬的 Repository 工廠
const mockRepo = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
});

describe("ConsistencyService", () => {
  let service: ConsistencyService;
  let moduleRef: TestingModule;
  let redis: jest.Mocked<
    Pick<RedisService, "set" | "get" | "del" | "lPush" | "lRange" | "getClient">
  >;
  let userRepo: ReturnType<typeof mockRepo>;
  let postRepo: ReturnType<typeof mockRepo>;

  // 模擬 Redis client 的 lrem 方法
  const mockLrem = jest.fn().mockResolvedValue(1);

  beforeEach(async () => {
    redis = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      lPush: jest.fn().mockResolvedValue(1),
      lRange: jest.fn().mockResolvedValue([]),
      getClient: jest.fn().mockReturnValue({ lrem: mockLrem }) as any,
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        ConsistencyService,
        { provide: getRepositoryToken(UserEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(PostEntity), useFactory: mockRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get<ConsistencyService>(ConsistencyService);
    userRepo = moduleRef.get(getRepositoryToken(UserEntity)) as any;
    postRepo = moduleRef.get(getRepositoryToken(PostEntity)) as any;

    jest.clearAllMocks();

    // 恢復預設的 mock 行為
    redis.set.mockResolvedValue(undefined);
    redis.get.mockResolvedValue(null);
    redis.del.mockResolvedValue(1);
    redis.lPush.mockResolvedValue(1);
    redis.lRange.mockResolvedValue([]);
    redis.getClient.mockReturnValue({ lrem: mockLrem } as any);
    mockLrem.mockResolvedValue(1);
  });

  afterEach(() => {
    // 確保測試後清除定時器，避免影響其他測試
    service.onModuleDestroy();
  });

  // =====================================================
  // addFailedWrite 測試
  // =====================================================
  describe("addFailedWrite", () => {
    it("應將失敗寫入記錄儲存到 Redis 並加入佇列", async () => {
      await service.addFailedWrite(
        "user",
        "user-123",
        "sync_redis",
        { email: "test@test.com" },
        "Connection refused",
      );

      // 驗證儲存失敗記錄的詳細資訊
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining("failed-writes:user:user-123:"),
        expect.any(String),
      );

      // 驗證記錄內容包含正確的欄位
      const setCall = redis.set.mock.calls[0];
      const record = JSON.parse(setCall[1]);
      expect(record).toMatchObject({
        type: "user",
        entityId: "user-123",
        operation: "sync_redis",
        payload: { email: "test@test.com" },
        error: "Connection refused",
        retryCount: 0,
        lastRetryAt: null,
      });
      expect(record.id).toContain("user:user-123:");
      expect(record.createdAt).toBeDefined();

      // 驗證 ID 被加入待處理佇列
      expect(redis.lPush).toHaveBeenCalledWith(
        "failed-writes:list",
        expect.stringContaining("user:user-123:"),
      );
    });

    it("應能記錄 post 類型的失敗寫入", async () => {
      await service.addFailedWrite(
        "post",
        "post-456",
        "sync_db",
        { caption: "Hello" },
        "Timeout",
      );

      const setCall = redis.set.mock.calls[0];
      const record = JSON.parse(setCall[1]);
      expect(record.type).toBe("post");
      expect(record.entityId).toBe("post-456");
      expect(record.operation).toBe("sync_db");
    });
  });

  // =====================================================
  // retryFailedWrites 測試
  // =====================================================
  describe("retryFailedWrites", () => {
    it("佇列為空時應直接回傳零值結果", async () => {
      redis.lRange.mockResolvedValue([]);

      const result = await service.retryFailedWrites();

      expect(result).toEqual({ retried: 0, succeeded: 0, failed: 0 });
    });

    it("應處理待重試的寫入（sync_redis 操作）", async () => {
      const failedRecord = {
        id: "user:u-1:1700000000000",
        type: "user",
        entityId: "u-1",
        operation: "sync_redis",
        payload: { email: "test@test.com" },
        error: "Connection refused",
        retryCount: 0,
        createdAt: "2024-01-01T00:00:00.000Z",
        lastRetryAt: null,
      };

      redis.lRange.mockResolvedValue(["user:u-1:1700000000000"]);
      redis.get.mockResolvedValueOnce(JSON.stringify(failedRecord));

      // 模擬 DB 中存在該使用者
      const mockUser = {
        id: "u-1",
        email: "test@test.com",
        passwordHash: "hash",
        displayName: "Test User",
        role: "subscriber",
        bio: "Hi",
        avatarUrl: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.retryFailedWrites();

      expect(result).toEqual({ retried: 1, succeeded: 1, failed: 0 });

      // 驗證從 DB 讀取並寫入 Redis
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: "u-1" } });
      expect(redis.set).toHaveBeenCalledWith(
        "user:u-1",
        expect.any(String),
      );

      // 驗證清理成功的記錄
      expect(mockLrem).toHaveBeenCalledWith(
        "failed-writes:list",
        0,
        "user:u-1:1700000000000",
      );
      expect(redis.del).toHaveBeenCalledWith(
        "failed-writes:user:u-1:1700000000000",
      );
    });

    it("超過最大重試次數時應放棄並移除記錄", async () => {
      const maxRetriedRecord = {
        id: "post:p-1:1700000000000",
        type: "post",
        entityId: "p-1",
        operation: "sync_db",
        payload: { caption: "test" },
        error: "persistent failure",
        retryCount: 10, // 已達最大重試次數 (MAX_RETRY_COUNT = 10)
        createdAt: "2024-01-01T00:00:00.000Z",
        lastRetryAt: "2024-01-05T00:00:00.000Z",
      };

      redis.lRange.mockResolvedValue(["post:p-1:1700000000000"]);
      redis.get.mockResolvedValueOnce(JSON.stringify(maxRetriedRecord));

      const result = await service.retryFailedWrites();

      expect(result).toEqual({ retried: 1, succeeded: 0, failed: 1 });

      // 驗證已從佇列中移除
      expect(mockLrem).toHaveBeenCalledWith(
        "failed-writes:list",
        0,
        "post:p-1:1700000000000",
      );
      // 驗證已刪除記錄詳情
      expect(redis.del).toHaveBeenCalledWith(
        "failed-writes:post:p-1:1700000000000",
      );

      // 不應嘗試執行實際的重試操作
      expect(postRepo.findOne).not.toHaveBeenCalled();
    });

    it("重試失敗時應更新重試計數與錯誤訊息", async () => {
      const failedRecord = {
        id: "user:u-2:1700000000000",
        type: "user",
        entityId: "u-2",
        operation: "sync_redis",
        payload: {},
        error: "old error",
        retryCount: 3,
        createdAt: "2024-01-01T00:00:00.000Z",
        lastRetryAt: "2024-01-03T00:00:00.000Z",
      };

      redis.lRange.mockResolvedValue(["user:u-2:1700000000000"]);
      redis.get.mockResolvedValueOnce(JSON.stringify(failedRecord));

      // 模擬 DB 查詢失敗
      userRepo.findOne.mockRejectedValue(new Error("DB connection lost"));

      const result = await service.retryFailedWrites();

      expect(result).toEqual({ retried: 1, succeeded: 0, failed: 1 });

      // 驗證更新了重試計數與錯誤訊息
      const setCall = redis.set.mock.calls.find(
        (c) => c[0] === "failed-writes:user:u-2:1700000000000",
      );
      expect(setCall).toBeDefined();
      const updatedRecord = JSON.parse(setCall![1]);
      expect(updatedRecord.retryCount).toBe(4);
      expect(updatedRecord.error).toBe("DB connection lost");
      expect(updatedRecord.lastRetryAt).toBeDefined();
    });

    it("當記錄已不存在時應從佇列中移除", async () => {
      redis.lRange.mockResolvedValue(["ghost:id:1700000000000"]);
      redis.get.mockResolvedValueOnce(null); // 記錄已不存在

      const result = await service.retryFailedWrites();

      // 當記錄不存在時不算在 succeeded/failed 裡
      expect(result.retried).toBe(1);
      expect(mockLrem).toHaveBeenCalledWith(
        "failed-writes:list",
        0,
        "ghost:id:1700000000000",
      );
    });
  });

  // =====================================================
  // runConsistencyCheck 測試
  // =====================================================
  describe("runConsistencyCheck", () => {
    it("當 Redis 中缺少快取時應偵測到不一致", async () => {
      const mockUser = {
        id: "u-1",
        email: "a@b.com",
        displayName: "UserA",
        role: "subscriber",
        createdAt: new Date(),
      };
      userRepo.find.mockResolvedValue([mockUser]);
      postRepo.find.mockResolvedValue([]);

      // Redis 中不存在此使用者快取
      redis.get.mockResolvedValue(null);

      const result = await service.runConsistencyCheck();

      expect(result.totalChecked).toBe(1);
      expect(result.totalInconsistencies).toBe(1);
      expect(result.userInconsistencies).toHaveLength(1);
      expect(result.userInconsistencies[0]).toEqual({
        entityId: "u-1",
        issue: "Redis 中不存在此使用者快取",
      });
      expect(result.postInconsistencies).toHaveLength(0);

      // 驗證將檢查結果儲存到 Redis
      expect(redis.set).toHaveBeenCalledWith(
        "consistency:stats",
        expect.any(String),
      );
    });

    it("當欄位不一致時應偵測到 user 欄位差異", async () => {
      const mockUser = {
        id: "u-2",
        email: "real@email.com",
        displayName: "RealName",
        role: "creator",
        createdAt: new Date(),
      };
      userRepo.find.mockResolvedValue([mockUser]);
      postRepo.find.mockResolvedValue([]);

      // Redis 中的資料與 DB 不一致
      redis.get.mockResolvedValue(
        JSON.stringify({
          id: "u-2",
          email: "old@email.com", // email 不一致
          displayName: "OldName", // displayName 不一致
          role: "subscriber", // role 不一致
        }),
      );

      const result = await service.runConsistencyCheck();

      // 應偵測到三個欄位不一致
      expect(result.userInconsistencies).toHaveLength(3);
      expect(result.userInconsistencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            entityId: "u-2",
            issue: expect.stringContaining("email 不一致"),
          }),
          expect.objectContaining({
            entityId: "u-2",
            issue: expect.stringContaining("displayName 不一致"),
          }),
          expect.objectContaining({
            entityId: "u-2",
            issue: expect.stringContaining("role 不一致"),
          }),
        ]),
      );
      expect(result.totalInconsistencies).toBe(3);
    });

    it("當 post 欄位不一致時應偵測到貼文差異", async () => {
      userRepo.find.mockResolvedValue([]);

      const mockPost = {
        id: "p-1",
        creatorId: "u-1",
        likeCount: 10,
        commentCount: 5,
        visibility: "public",
        createdAt: new Date(),
      };
      postRepo.find.mockResolvedValue([mockPost]);

      // Redis 中的 likeCount 與 visibility 不一致
      redis.get.mockResolvedValue(
        JSON.stringify({
          id: "p-1",
          creatorId: "u-1",
          likeCount: 8, // 不一致
          commentCount: 5,
          visibility: "private", // 不一致
        }),
      );

      const result = await service.runConsistencyCheck();

      expect(result.postInconsistencies).toHaveLength(2);
      expect(result.postInconsistencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            entityId: "p-1",
            issue: expect.stringContaining("likeCount 不一致"),
          }),
          expect.objectContaining({
            entityId: "p-1",
            issue: expect.stringContaining("visibility 不一致"),
          }),
        ]),
      );
    });

    it("當 Redis 中缺少 post 快取時應偵測到不一致", async () => {
      userRepo.find.mockResolvedValue([]);

      const mockPost = {
        id: "p-2",
        creatorId: "u-1",
        likeCount: 0,
        commentCount: 0,
        visibility: "public",
        createdAt: new Date(),
      };
      postRepo.find.mockResolvedValue([mockPost]);

      redis.get.mockResolvedValue(null);

      const result = await service.runConsistencyCheck();

      expect(result.postInconsistencies).toHaveLength(1);
      expect(result.postInconsistencies[0]).toEqual({
        entityId: "p-2",
        issue: "Redis 中不存在此貼文快取",
      });
    });

    it("資料完全一致時應回傳零個不一致", async () => {
      const mockUser = {
        id: "u-ok",
        email: "ok@test.com",
        displayName: "OkUser",
        role: "subscriber",
        createdAt: new Date(),
      };
      userRepo.find.mockResolvedValue([mockUser]);
      postRepo.find.mockResolvedValue([]);

      redis.get.mockResolvedValue(
        JSON.stringify({
          id: "u-ok",
          email: "ok@test.com",
          displayName: "OkUser",
          role: "subscriber",
        }),
      );

      const result = await service.runConsistencyCheck();

      expect(result.totalInconsistencies).toBe(0);
      expect(result.userInconsistencies).toHaveLength(0);
      expect(result.postInconsistencies).toHaveLength(0);
    });
  });

  // =====================================================
  // autoRepair 測試
  // =====================================================
  describe("autoRepair", () => {
    it("應從 DB 讀取資料並修復 Redis 快取", async () => {
      // 第一次呼叫：runConsistencyCheck 中的 find
      const mockUser = {
        id: "u-repair",
        email: "repair@test.com",
        passwordHash: "hash",
        displayName: "RepairUser",
        role: "creator",
        bio: "bio",
        avatarUrl: "https://avatar.url",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      };

      // runConsistencyCheck 會呼叫 find 取得使用者清單
      userRepo.find.mockResolvedValue([mockUser]);
      postRepo.find.mockResolvedValue([]);

      // Redis 中缺少此使用者（第一次 get 回傳 null 觸發不一致偵測）
      redis.get.mockResolvedValue(null);

      // autoRepair 會再次 findOne 取得完整資料以修復
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.autoRepair();

      expect(result.repaired).toBe(1);
      expect(result.errors).toHaveLength(0);

      // 驗證將 DB 資料寫入 Redis
      expect(redis.set).toHaveBeenCalledWith(
        "user:u-repair",
        expect.any(String),
      );

      // 驗證寫入的資料包含正確欄位
      const repairCall = redis.set.mock.calls.find(
        (c) => c[0] === "user:u-repair",
      );
      expect(repairCall).toBeDefined();
      const repairedData = JSON.parse(repairCall![1]);
      expect(repairedData).toMatchObject({
        id: "u-repair",
        email: "repair@test.com",
        displayName: "RepairUser",
        role: "creator",
      });
    });

    it("修復失敗時應記錄錯誤", async () => {
      const mockUser = {
        id: "u-fail",
        email: "fail@test.com",
        displayName: "FailUser",
        role: "subscriber",
        createdAt: new Date(),
      };

      userRepo.find.mockResolvedValue([mockUser]);
      postRepo.find.mockResolvedValue([]);

      // Redis 中缺少快取
      redis.get.mockResolvedValue(null);

      // autoRepair 嘗試修復時 findOne 拋出錯誤
      userRepo.findOne.mockRejectedValue(new Error("DB unreachable"));

      const result = await service.autoRepair();

      expect(result.repaired).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        entityId: "u-fail",
        error: "DB unreachable",
      });
    });

    it("無不一致時應回傳零修復", async () => {
      userRepo.find.mockResolvedValue([]);
      postRepo.find.mockResolvedValue([]);

      const result = await service.autoRepair();

      expect(result.repaired).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("應能修復 post 資料不一致", async () => {
      userRepo.find.mockResolvedValue([]);

      const mockPost = {
        id: "p-repair",
        creatorId: "u-1",
        contentType: "image",
        caption: "test",
        mediaUrls: ["https://img.jpg"],
        visibility: "public",
        requiredTierId: null,
        ppvPrice: null,
        likeCount: 5,
        commentCount: 2,
        createdAt: new Date("2024-06-01"),
      };

      postRepo.find.mockResolvedValue([mockPost]);

      // Redis 中缺少此貼文
      redis.get.mockResolvedValue(null);

      postRepo.findOne.mockResolvedValue(mockPost);

      const result = await service.autoRepair();

      expect(result.repaired).toBe(1);
      expect(redis.set).toHaveBeenCalledWith(
        "post:p-repair",
        expect.any(String),
      );
    });
  });

  // =====================================================
  // getFailedWriteStats 測試
  // =====================================================
  describe("getFailedWriteStats", () => {
    it("應回傳待處理數量與記錄清單", async () => {
      const record1 = {
        id: "user:u-1:1700000000000",
        type: "user",
        entityId: "u-1",
        operation: "sync_redis",
        payload: {},
        error: "err",
        retryCount: 2,
        createdAt: "2024-01-01T00:00:00.000Z",
        lastRetryAt: "2024-01-02T00:00:00.000Z",
      };
      const record2 = {
        id: "post:p-1:1700000000001",
        type: "post",
        entityId: "p-1",
        operation: "sync_db",
        payload: {},
        error: "err2",
        retryCount: 0,
        createdAt: "2024-01-03T00:00:00.000Z",
        lastRetryAt: null,
      };

      redis.lRange.mockResolvedValue([
        "user:u-1:1700000000000",
        "post:p-1:1700000000001",
      ]);
      redis.get
        .mockResolvedValueOnce(JSON.stringify(record1))
        .mockResolvedValueOnce(JSON.stringify(record2));

      const stats = await service.getFailedWriteStats();

      expect(stats.pendingCount).toBe(2);
      expect(stats.records).toHaveLength(2);
      expect(stats.records[0]).toEqual(record1);
      expect(stats.records[1]).toEqual(record2);
    });

    it("佇列為空時應回傳零值", async () => {
      redis.lRange.mockResolvedValue([]);

      const stats = await service.getFailedWriteStats();

      expect(stats.pendingCount).toBe(0);
      expect(stats.records).toHaveLength(0);
    });

    it("應跳過格式錯誤的記錄", async () => {
      redis.lRange.mockResolvedValue(["bad:record:1"]);
      redis.get.mockResolvedValueOnce("not-valid-json{{");

      const stats = await service.getFailedWriteStats();

      expect(stats.pendingCount).toBe(0);
      expect(stats.records).toHaveLength(0);
    });
  });

  // =====================================================
  // onModuleInit / onModuleDestroy 測試
  // =====================================================
  describe("onModuleInit / onModuleDestroy", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("應在模組初始化時啟動定時重試工作", () => {
      // onModuleInit 會建立 setInterval
      service.onModuleInit();

      // 驗證定時器已建立（通過確認有定時器存在）
      expect(jest.getTimerCount()).toBeGreaterThanOrEqual(1);
    });

    it("應在模組銷毀時清除定時器", () => {
      service.onModuleInit();
      expect(jest.getTimerCount()).toBeGreaterThanOrEqual(1);

      service.onModuleDestroy();

      // 確認定時器已被清除
      expect(jest.getTimerCount()).toBe(0);
    });

    it("定時器應觸發 retryFailedWrites", async () => {
      redis.lRange.mockResolvedValue([]);
      const retrySpy = jest.spyOn(service, "retryFailedWrites");

      service.onModuleInit();

      // 前進 30 秒觸發定時器
      jest.advanceTimersByTime(30_000);

      // 等待非同步執行
      await Promise.resolve();

      expect(retrySpy).toHaveBeenCalledTimes(1);

      retrySpy.mockRestore();
    });

    it("重複呼叫 onModuleDestroy 不應拋出錯誤", () => {
      service.onModuleInit();
      service.onModuleDestroy();

      // 第二次呼叫不應拋出錯誤
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
