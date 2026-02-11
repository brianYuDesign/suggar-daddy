import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { FcmService } from "./fcm.service";
import { RedisService } from "@suggar-daddy/redis";
import { KafkaConsumerService } from "@suggar-daddy/kafka";

// Mock firebase-admin（注意：firebase-admin 可能尚未安裝）
jest.mock("firebase-admin", () => {
  const sendMock = jest.fn().mockResolvedValue("mock-message-id");
  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn().mockReturnValue("mock-credential"),
    },
    messaging: jest.fn().mockReturnValue({
      send: sendMock,
    }),
  };
});

// 取得 mock 後的 firebase-admin 以便在測試中存取
import * as admin from "firebase-admin";

describe("FcmService", () => {
  let service: FcmService;
  let redisService: jest.Mocked<RedisService>;
  let kafkaConsumer: jest.Mocked<KafkaConsumerService>;
  let configService: jest.Mocked<ConfigService>;

  /** 模擬 RedisService */
  const mockRedisService = {
    sAdd: jest.fn().mockResolvedValue(1),
    sRem: jest.fn().mockResolvedValue(1),
    sMembers: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    lPush: jest.fn(),
    lRange: jest.fn(),
  };

  /** 模擬 KafkaConsumerService */
  const mockKafkaConsumer = {
    subscribe: jest.fn().mockResolvedValue(undefined),
    startConsuming: jest.fn().mockResolvedValue(undefined),
  };

  /** 模擬 ConfigService（預設不回傳 Firebase 憑證） */
  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: KafkaConsumerService, useValue: mockKafkaConsumer },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FcmService>(FcmService);
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
    kafkaConsumer = module.get(KafkaConsumerService) as jest.Mocked<KafkaConsumerService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  // ─── 裝置令牌管理測試 ────────────────────────────────────────────

  describe("registerToken - 註冊裝置令牌", () => {
    it("應將令牌與平台資訊存入 Redis Set", async () => {
      await service.registerToken("user-1", "fcm-token-abc", "ios");

      expect(redisService.sAdd).toHaveBeenCalledWith(
        "device-tokens:user-1",
        JSON.stringify({ token: "fcm-token-abc", platform: "ios" }),
      );
    });

    it("應支援不同平台（android / web）", async () => {
      await service.registerToken("user-2", "token-android", "android");
      await service.registerToken("user-2", "token-web", "web");

      expect(redisService.sAdd).toHaveBeenCalledTimes(2);
    });
  });

  describe("removeToken - 移除裝置令牌", () => {
    it("應從 Redis Set 中移除指定令牌", async () => {
      const storedValue = JSON.stringify({ token: "fcm-token-xyz", platform: "ios" });
      redisService.sMembers.mockResolvedValue([storedValue]);

      await service.removeToken("user-1", "fcm-token-xyz");

      expect(redisService.sRem).toHaveBeenCalledWith(
        "device-tokens:user-1",
        storedValue,
      );
    });

    it("若令牌不存在不應呼叫 sRem", async () => {
      redisService.sMembers.mockResolvedValue([]);

      await service.removeToken("user-1", "non-existent-token");

      expect(redisService.sRem).not.toHaveBeenCalled();
    });
  });

  describe("getUserTokens - 取得使用者裝置令牌", () => {
    it("應解析 Redis Set 並回傳令牌字串陣列", async () => {
      redisService.sMembers.mockResolvedValue([
        JSON.stringify({ token: "token-1", platform: "ios" }),
        JSON.stringify({ token: "token-2", platform: "android" }),
        JSON.stringify({ token: "token-3", platform: "web" }),
      ]);

      const tokens = await service.getUserTokens("user-1");

      expect(tokens).toEqual(["token-1", "token-2", "token-3"]);
    });

    it("使用者沒有令牌時應回傳空陣列", async () => {
      redisService.sMembers.mockResolvedValue([]);

      const tokens = await service.getUserTokens("user-empty");

      expect(tokens).toEqual([]);
    });

    it("應略過無法解析的項目", async () => {
      redisService.sMembers.mockResolvedValue([
        "invalid-json",
        JSON.stringify({ token: "valid-token", platform: "ios" }),
      ]);

      const tokens = await service.getUserTokens("user-1");

      expect(tokens).toEqual(["valid-token"]);
    });
  });

  // ─── 推播通知測試 ──────────────────────────────────────────────────

  describe("sendPushNotification - 發送推播通知", () => {
    it("Firebase 未初始化時應跳過推播", async () => {
      // 預設 configService.get 回傳 undefined，Firebase 不會初始化
      await service.onModuleInit();

      await service.sendPushNotification("token-1", "標題", "內文");

      expect(admin.messaging).not.toHaveBeenCalled();
    });

    it("Firebase 已初始化時應呼叫 messaging().send()", async () => {
      // 模擬 Firebase 憑證存在
      configService.get.mockImplementation((key: string) => {
        const envMap: Record<string, string> = {
          FIREBASE_PROJECT_ID: "test-project",
          FIREBASE_CLIENT_EMAIL: "test@test.iam.gserviceaccount.com",
          FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----",
        };
        return envMap[key];
      });

      await service.onModuleInit();

      await service.sendPushNotification(
        "test-device-token",
        "測試標題",
        "測試內文",
        { key: "value" },
      );

      expect(admin.messaging).toHaveBeenCalled();
      expect(admin.messaging().send).toHaveBeenCalledWith({
        token: "test-device-token",
        notification: { title: "測試標題", body: "測試內文" },
        data: { key: "value" },
      });
    });
  });

  // ─── Kafka 訂閱測試 ───────────────────────────────────────────────

  describe("onModuleInit - Kafka 訂閱", () => {
    it("應訂閱 notification.created 事件", async () => {
      await service.onModuleInit();

      expect(kafkaConsumer.subscribe).toHaveBeenCalledWith(
        "notification.created",
        expect.any(Function),
      );
    });
  });
});