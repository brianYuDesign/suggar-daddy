import { Test, TestingModule } from "@nestjs/testing";
import { DlqService, DlqMessage } from "./dlq.service";
import { RedisService } from "@suggar-daddy/redis";
import { KafkaProducerService } from "@suggar-daddy/kafka";

describe("DlqService", () => {
  let service: DlqService;
  let redis: jest.Mocked<
    Pick<RedisService, "set" | "get" | "del" | "lPush" | "lRange" | "getClient">
  >;
  let kafkaProducer: jest.Mocked<Pick<KafkaProducerService, "sendEvent">>;

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

    kafkaProducer = {
      sendEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DlqService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafkaProducer },
      ],
    }).compile();

    service = module.get<DlqService>(DlqService);
    jest.clearAllMocks();

    // 恢復預設的 mock 行為
    redis.set.mockResolvedValue(undefined);
    redis.get.mockResolvedValue(null);
    redis.del.mockResolvedValue(1);
    redis.lPush.mockResolvedValue(1);
    redis.lRange.mockResolvedValue([]);
    redis.getClient.mockReturnValue({ lrem: mockLrem } as any);
    kafkaProducer.sendEvent.mockResolvedValue(undefined);
    mockLrem.mockResolvedValue(1);
  });

  // =====================================================
  // addToDeadLetterQueue 測試
  // =====================================================
  describe("addToDeadLetterQueue", () => {
    it("應將訊息儲存到 Redis 並推入列表，同時發送 Kafka 事件", async () => {
      // 佇列大小未超過閾值
      redis.lRange.mockResolvedValue([]);

      const result = await service.addToDeadLetterQueue(
        "user.created",
        { userId: "u-1" },
        "DB write failed",
        3,
      );

      // 驗證回傳的 DlqMessage 結構
      expect(result).toMatchObject({
        originalTopic: "user.created",
        payload: { userId: "u-1" },
        error: "DB write failed",
        attempts: 3,
      });
      expect(result.id).toMatch(/^dlq-/);
      expect(result.createdAt).toBeDefined();
      expect(result.lastAttemptAt).toBeDefined();

      // 驗證 Redis set（儲存訊息詳情）
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining("dlq:msg:dlq-"),
        expect.any(String),
      );

      // 驗證 Redis lPush（推入佇列列表）
      expect(redis.lPush).toHaveBeenCalledWith(
        "dlq:messages",
        expect.stringMatching(/^dlq-/),
      );

      // 驗證 Kafka 事件發送到 dead-letter-queue topic
      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        "dead-letter-queue",
        expect.objectContaining({
          originalTopic: "user.created",
          payload: { userId: "u-1" },
        }),
      );
    });

    it("當佇列大小超過閾值時應發送 dlq.alert 事件", async () => {
      // 模擬佇列中已有超過 100 筆訊息
      const largeQueue = Array.from({ length: 101 }, (_, i) => "dlq-" + i);
      redis.lRange.mockResolvedValue(largeQueue);

      await service.addToDeadLetterQueue(
        "payment.completed",
        { amount: 100 },
        "timeout",
        1,
      );

      // 應該呼叫兩次 sendEvent：一次是 dead-letter-queue，一次是 dlq.alert
      expect(kafkaProducer.sendEvent).toHaveBeenCalledTimes(2);
      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        "dlq.alert",
        expect.objectContaining({
          type: "queue_size_exceeded",
          currentSize: 101,
          threshold: 100,
        }),
      );
    });

    it("當佇列大小未超過閾值時不應發送 dlq.alert", async () => {
      // 佇列中只有 50 筆
      const smallQueue = Array.from({ length: 50 }, (_, i) => "dlq-" + i);
      redis.lRange.mockResolvedValue(smallQueue);

      await service.addToDeadLetterQueue(
        "content.post.created",
        { postId: "p-1" },
        "error",
        0,
      );

      // 只應呼叫一次 sendEvent（dead-letter-queue topic）
      expect(kafkaProducer.sendEvent).toHaveBeenCalledTimes(1);
      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        "dead-letter-queue",
        expect.any(Object),
      );
    });
  });

  // =====================================================
  // listMessages 測試
  // =====================================================
  describe("listMessages", () => {
    it("應回傳分頁的訊息清單", async () => {
      const msg1: DlqMessage = {
        id: "dlq-1",
        originalTopic: "user.created",
        payload: { userId: "u-1" },
        error: "fail",
        attempts: 1,
        createdAt: "2024-01-01T00:00:00.000Z",
        lastAttemptAt: "2024-01-01T00:00:00.000Z",
      };
      const msg2: DlqMessage = {
        id: "dlq-2",
        originalTopic: "payment.completed",
        payload: { amount: 50 },
        error: "timeout",
        attempts: 2,
        createdAt: "2024-01-02T00:00:00.000Z",
        lastAttemptAt: "2024-01-02T00:00:00.000Z",
      };

      redis.lRange.mockResolvedValue(["dlq-1", "dlq-2"]);
      redis.get
        .mockResolvedValueOnce(JSON.stringify(msg1))
        .mockResolvedValueOnce(JSON.stringify(msg2));

      const result = await service.listMessages(10, 0);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(msg1);
      expect(result[1]).toEqual(msg2);

      // 驗證 lRange 使用正確的分頁參數
      expect(redis.lRange).toHaveBeenCalledWith("dlq:messages", 0, 9);
    });

    it("應使用自訂的 offset 與 limit", async () => {
      redis.lRange.mockResolvedValue([]);

      await service.listMessages(20, 5);

      expect(redis.lRange).toHaveBeenCalledWith("dlq:messages", 5, 24);
    });

    it("應跳過在 Redis 中不存在的訊息", async () => {
      redis.lRange.mockResolvedValue(["dlq-1", "dlq-ghost"]);
      redis.get
        .mockResolvedValueOnce(
          JSON.stringify({
            id: "dlq-1",
            originalTopic: "t",
            payload: {},
            error: "e",
            attempts: 0,
            createdAt: "2024-01-01T00:00:00.000Z",
            lastAttemptAt: "2024-01-01T00:00:00.000Z",
          }),
        )
        .mockResolvedValueOnce(null); // dlq-ghost 不存在

      const result = await service.listMessages();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("dlq-1");
    });
  });

  // =====================================================
  // getMessage 測試
  // =====================================================
  describe("getMessage", () => {
    it("應回傳指定 ID 的訊息", async () => {
      const msg: DlqMessage = {
        id: "dlq-123",
        originalTopic: "subscription.created",
        payload: { subId: "s-1" },
        error: "fail",
        attempts: 1,
        createdAt: "2024-01-01T00:00:00.000Z",
        lastAttemptAt: "2024-01-01T00:00:00.000Z",
      };

      redis.get.mockResolvedValue(JSON.stringify(msg));

      const result = await service.getMessage("dlq-123");

      expect(result).toEqual(msg);
      expect(redis.get).toHaveBeenCalledWith("dlq:msg:dlq-123");
    });

    it("當訊息不存在時應回傳 null", async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getMessage("dlq-nonexistent");

      expect(result).toBeNull();
    });
  });

  // =====================================================
  // retryMessage 測試
  // =====================================================
  describe("retryMessage", () => {
    it("重試成功：應重新發送到原始 topic 並從 Redis 移除", async () => {
      const msg: DlqMessage = {
        id: "dlq-retry-1",
        originalTopic: "user.created",
        payload: { userId: "u-retry" },
        error: "old error",
        attempts: 2,
        createdAt: "2024-01-01T00:00:00.000Z",
        lastAttemptAt: "2024-01-01T00:00:00.000Z",
      };

      redis.get.mockResolvedValue(JSON.stringify(msg));
      kafkaProducer.sendEvent.mockResolvedValue(undefined);

      const result = await service.retryMessage("dlq-retry-1");

      expect(result).toBe(true);

      // 驗證重新發送到原始 topic
      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        "user.created",
        { userId: "u-retry" },
      );

      // 驗證更新後的訊息（attempts + 1）寫回 Redis
      expect(redis.set).toHaveBeenCalledWith(
        "dlq:msg:dlq-retry-1",
        expect.any(String),
      );

      // 驗證從列表中移除（lrem）
      expect(mockLrem).toHaveBeenCalledWith("dlq:messages", 0, "dlq-retry-1");

      // 驗證刪除訊息詳情
      expect(redis.del).toHaveBeenCalledWith("dlq:msg:dlq-retry-1");
    });

    it("重試失敗：Kafka 發送失敗時應更新錯誤訊息並回傳 false", async () => {
      const msg: DlqMessage = {
        id: "dlq-retry-fail",
        originalTopic: "payment.completed",
        payload: { amount: 99 },
        error: "old error",
        attempts: 1,
        createdAt: "2024-01-01T00:00:00.000Z",
        lastAttemptAt: "2024-01-01T00:00:00.000Z",
      };

      redis.get.mockResolvedValue(JSON.stringify(msg));
      kafkaProducer.sendEvent.mockRejectedValue(new Error("Kafka broker down"));

      const result = await service.retryMessage("dlq-retry-fail");

      expect(result).toBe(false);

      // 驗證更新了錯誤資訊（attempts + 1）
      const setCall = redis.set.mock.calls.find(
        (c) => c[0] === "dlq:msg:dlq-retry-fail",
      );
      expect(setCall).toBeDefined();
      const updatedMsg = JSON.parse(setCall![1]);
      expect(updatedMsg.attempts).toBe(2);
      expect(updatedMsg.error).toBe("Kafka broker down");

      // 不應從列表中移除
      expect(mockLrem).not.toHaveBeenCalled();
      expect(redis.del).not.toHaveBeenCalled();
    });

    it("當訊息不存在時應回傳 false", async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.retryMessage("dlq-nonexistent");

      expect(result).toBe(false);
      expect(kafkaProducer.sendEvent).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // deleteMessage 測試
  // =====================================================
  describe("deleteMessage", () => {
    it("應刪除存在的訊息並回傳 true", async () => {
      redis.get.mockResolvedValue(JSON.stringify({ id: "dlq-del-1" }));

      const result = await service.deleteMessage("dlq-del-1");

      expect(result).toBe(true);
      expect(mockLrem).toHaveBeenCalledWith("dlq:messages", 0, "dlq-del-1");
      expect(redis.del).toHaveBeenCalledWith("dlq:msg:dlq-del-1");
    });

    it("當訊息不存在時應回傳 false", async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.deleteMessage("dlq-nonexistent");

      expect(result).toBe(false);
      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // purgeAll 測試
  // =====================================================
  describe("purgeAll", () => {
    it("應清除所有訊息並回傳刪除數量", async () => {
      redis.lRange.mockResolvedValue(["dlq-1", "dlq-2", "dlq-3"]);

      const result = await service.purgeAll();

      expect(result).toBe(3);

      // 應刪除每個訊息的獨立 key
      expect(redis.del).toHaveBeenCalledWith("dlq:msg:dlq-1");
      expect(redis.del).toHaveBeenCalledWith("dlq:msg:dlq-2");
      expect(redis.del).toHaveBeenCalledWith("dlq:msg:dlq-3");

      // 應刪除列表本身
      expect(redis.del).toHaveBeenCalledWith("dlq:messages");
    });

    it("佇列為空時應回傳 0", async () => {
      redis.lRange.mockResolvedValue([]);

      const result = await service.purgeAll();

      expect(result).toBe(0);
      // 仍應嘗試刪除列表 key
      expect(redis.del).toHaveBeenCalledWith("dlq:messages");
    });
  });

  // =====================================================
  // getStats 測試
  // =====================================================
  describe("getStats", () => {
    it("應回傳正確的訊息計數與 topic 分類統計", async () => {
      const messages: DlqMessage[] = [
        {
          id: "dlq-s1",
          originalTopic: "user.created",
          payload: {},
          error: "e1",
          attempts: 1,
          createdAt: "2024-01-01T00:00:00.000Z",
          lastAttemptAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "dlq-s2",
          originalTopic: "user.created",
          payload: {},
          error: "e2",
          attempts: 2,
          createdAt: "2024-01-03T00:00:00.000Z",
          lastAttemptAt: "2024-01-03T00:00:00.000Z",
        },
        {
          id: "dlq-s3",
          originalTopic: "payment.completed",
          payload: {},
          error: "e3",
          attempts: 1,
          createdAt: "2024-01-02T00:00:00.000Z",
          lastAttemptAt: "2024-01-02T00:00:00.000Z",
        },
      ];

      redis.lRange.mockResolvedValue(["dlq-s1", "dlq-s2", "dlq-s3"]);
      redis.get
        .mockResolvedValueOnce(JSON.stringify(messages[0]))
        .mockResolvedValueOnce(JSON.stringify(messages[1]))
        .mockResolvedValueOnce(JSON.stringify(messages[2]));

      const stats = await service.getStats();

      expect(stats.totalMessages).toBe(3);
      expect(stats.topicCounts).toEqual({
        "user.created": 2,
        "payment.completed": 1,
      });
      // 最舊的訊息是 2024-01-01
      expect(stats.oldestMessage).toBe("2024-01-01T00:00:00.000Z");
      // 最新的訊息是 2024-01-03
      expect(stats.newestMessage).toBe("2024-01-03T00:00:00.000Z");
    });

    it("佇列為空時應回傳零值統計", async () => {
      redis.lRange.mockResolvedValue([]);

      const stats = await service.getStats();

      expect(stats.totalMessages).toBe(0);
      expect(stats.topicCounts).toEqual({});
      expect(stats.oldestMessage).toBeNull();
      expect(stats.newestMessage).toBeNull();
    });
  });
});
