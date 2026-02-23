/**
 * MessagingGateway 單元測試
 *
 * 測試 WebSocket 即時訊息閘道的核心功能：
 * - handleConnection: JWT 身份驗證（F-002）
 * - handleJoin: 確認已認證連線
 * - handleSendMessage: 發送訊息（使用已驗證 userId）
 * - handleTyping: 輸入中狀態廣播
 * - getOnlineUsers: 在線用戶追蹤
 * - handleDisconnect: 用戶斷線清理
 */

import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";
import { KafkaConsumerService } from "@suggar-daddy/kafka";
import { RedisService } from "@suggar-daddy/redis";

/** 建立模擬 Socket 物件 */
function createMockSocket(id: string, token?: string) {
  return {
    id,
    join: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    handshake: {
      auth: { token: token || "" },
      headers: {},
    },
    __userId: undefined as string | undefined,
  };
}

/** 模擬 MessagingService */
const mockMessagingService = {
  send: jest.fn(),
  isParticipant: jest.fn(),
  ensureConversation: jest.fn(),
  getConversations: jest.fn(),
  getMessages: jest.fn(),
  markAsRead: jest.fn(),
};

/** 模擬 KafkaConsumerService */
const mockKafkaConsumerService = {
  subscribe: jest.fn(),
  startConsuming: jest.fn(),
};

/** 模擬 JwtService */
const mockJwtService = {
  verify: jest.fn(),
};

/** [N-005] 模擬 RedisService — 追蹤 sAdd/sRem 以回傳正確的在線用戶 */
const onlineSet = new Set<string>();
const mockRedisService = {
  sAdd: jest.fn(async (_key: string, userId: string) => { onlineSet.add(userId); return 1; }),
  sRem: jest.fn(async (_key: string, userId: string) => { onlineSet.delete(userId); return 1; }),
  sMembers: jest.fn(async () => [...onlineSet]),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(true),
};

describe("MessagingGateway", () => {
  let gateway: MessagingGateway;

  beforeEach(async () => {
    jest.clearAllMocks();
    onlineSet.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        { provide: MessagingService, useValue: mockMessagingService },
        { provide: KafkaConsumerService, useValue: mockKafkaConsumerService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);

    // 模擬 WebSocket Server
    (gateway as any).server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  /** 模擬一個已認證連線（呼叫 handleConnection） */
  function authenticateSocket(client: ReturnType<typeof createMockSocket>, userId: string) {
    mockJwtService.verify.mockReturnValue({ sub: userId });
    gateway.handleConnection(client as any);
  }

  describe("handleConnection - JWT 身份驗證 (F-002)", () => {
    it("有效 token 應該驗證成功並追蹤在線狀態", async () => {
      const mockClient = createMockSocket("socket-1", "valid-token");
      mockJwtService.verify.mockReturnValue({ sub: "user-123" });

      gateway.handleConnection(mockClient as any);

      // 驗證 JWT 被驗證
      expect(mockJwtService.verify).toHaveBeenCalledWith("valid-token");

      // 驗證自動加入個人房間
      expect(mockClient.join).toHaveBeenCalledWith("user:user-123");

      // 驗證回傳認證成功
      expect(mockClient.emit).toHaveBeenCalledWith("authenticated", { userId: "user-123" });

      // 驗證廣播上線事件
      expect((gateway as any).server.emit).toHaveBeenCalledWith("user_online", { userId: "user-123" });

      // 驗證用戶在線
      expect(await gateway.getOnlineUsers()).toContain("user-123");
    });

    it("缺少 token 應該斷開連線", async () => {
      const mockClient = createMockSocket("socket-1");

      gateway.handleConnection(mockClient as any);

      expect(mockClient.emit).toHaveBeenCalledWith("error", { message: "需要提供認證 token" });
      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(await gateway.getOnlineUsers()).toEqual([]);
    });

    it("無效 token 應該斷開連線", () => {
      const mockClient = createMockSocket("socket-1", "bad-token");
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      gateway.handleConnection(mockClient as any);

      expect(mockClient.emit).toHaveBeenCalledWith("error", { message: "認證失敗，token 無效或已過期" });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it("同一用戶重複連線應該更新 Socket 映射", async () => {
      const mockClient1 = createMockSocket("socket-old", "token-1");
      const mockClient2 = createMockSocket("socket-new", "token-2");

      authenticateSocket(mockClient1, "user-456");
      authenticateSocket(mockClient2, "user-456");

      const onlineUsers = await gateway.getOnlineUsers();
      expect(onlineUsers.filter((id) => id === "user-456")).toHaveLength(1);
    });
  });

  describe("handleJoin - 確認已認證連線", () => {
    it("已認證用戶應該回傳成功", () => {
      const mockClient = createMockSocket("socket-1", "valid-token");
      authenticateSocket(mockClient, "user-123");

      const result = gateway.handleJoin(mockClient as any);

      expect(result).toEqual({
        event: "joined",
        data: { userId: "user-123", message: "已成功加入" },
      });
    });

    it("未認證連線應該回傳錯誤", () => {
      const mockClient = createMockSocket("socket-1");

      const result = gateway.handleJoin(mockClient as any);

      expect(result).toEqual({
        event: "error",
        data: { message: "未認證的連線" },
      });
    });
  });

  describe("handleSendMessage - 發送訊息 (W-007)", () => {
    it("應該使用已驗證 userId 發送訊息", async () => {
      const mockClient = createMockSocket("socket-1", "valid-token");
      authenticateSocket(mockClient, "user-a");

      mockMessagingService.isParticipant.mockResolvedValue(true);
      const mockMessage = {
        id: "msg-001",
        conversationId: "user-a::user-b",
        senderId: "user-a",
        content: "你好！",
        createdAt: new Date("2025-01-01"),
      };
      mockMessagingService.send.mockResolvedValue(mockMessage);

      const result = await gateway.handleSendMessage(mockClient as any, {
        conversationId: "user-a::user-b",
        content: "你好！",
      });

      // 驗證使用已驗證的 userId（而非客戶端傳入）
      expect(mockMessagingService.send).toHaveBeenCalledWith(
        "user-a",
        "user-a::user-b",
        "你好！",
      );

      expect(result).toEqual({
        event: "message_sent",
        data: { messageId: "msg-001" },
      });
    });

    it("未認證連線應該回傳錯誤", async () => {
      const mockClient = createMockSocket("socket-1");

      const result = await gateway.handleSendMessage(mockClient as any, {
        conversationId: "conv-1",
        content: "test",
      });

      expect(result).toEqual({
        event: "error",
        data: { message: "未認證的連線" },
      });
      expect(mockMessagingService.send).not.toHaveBeenCalled();
    });

    it("缺少必填欄位時應該回傳錯誤", async () => {
      const mockClient = createMockSocket("socket-1", "valid-token");
      authenticateSocket(mockClient, "user-a");

      const result = await gateway.handleSendMessage(mockClient as any, {
        conversationId: "",
        content: "test",
      });

      expect(result).toEqual({
        event: "error",
        data: { message: "conversationId, content 為必填欄位" },
      });
    });

    it("非對話參與者時應該回傳錯誤", async () => {
      const mockClient = createMockSocket("socket-1", "valid-token");
      authenticateSocket(mockClient, "user-intruder");
      mockMessagingService.isParticipant.mockResolvedValue(false);

      const result = await gateway.handleSendMessage(mockClient as any, {
        conversationId: "user-a::user-b",
        content: "偷看",
      });

      expect(result).toEqual({
        event: "error",
        data: { message: "您不是此對話的參與者" },
      });
      expect(mockMessagingService.send).not.toHaveBeenCalled();
    });

    it("MessagingService.send 拋出例外時應該回傳錯誤", async () => {
      const mockClient = createMockSocket("socket-1", "valid-token");
      authenticateSocket(mockClient, "user-a");
      mockMessagingService.isParticipant.mockResolvedValue(true);
      mockMessagingService.send.mockRejectedValue(new Error("Redis error"));

      const result = await gateway.handleSendMessage(mockClient as any, {
        conversationId: "user-a::user-b",
        content: "test",
      });

      expect(result).toEqual({
        event: "error",
        data: { message: "Redis error" },
      });
    });
  });

  describe("handleTyping - 輸入中狀態", () => {
    it("應該使用已驗證 userId 廣播 typing 狀態", () => {
      const mockClient = createMockSocket("socket-1", "valid-token");
      authenticateSocket(mockClient, "user-a");

      gateway.handleTyping(mockClient as any, { conversationId: "conv-1" });

      expect(mockClient.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockClient.emit).toHaveBeenCalledWith("user_typing", {
        userId: "user-a",
        conversationId: "conv-1",
      });
      expect(mockClient.join).toHaveBeenCalledWith("conversation:conv-1");
    });

    it("未認證連線不應該廣播", () => {
      const mockClient = createMockSocket("socket-1");

      gateway.handleTyping(mockClient as any, { conversationId: "conv-1" });

      expect(mockClient.to).not.toHaveBeenCalled();
    });
  });

  describe("getOnlineUsers - 在線用戶追蹤", () => {
    it("初始狀態應該沒有在線用戶", async () => {
      expect(await gateway.getOnlineUsers()).toEqual([]);
    });

    it("多個用戶認證連線後應該全部出現在在線列表", async () => {
      const c1 = createMockSocket("socket-1", "t1");
      const c2 = createMockSocket("socket-2", "t2");

      authenticateSocket(c1, "user-a");
      authenticateSocket(c2, "user-b");

      const onlineUsers = await gateway.getOnlineUsers();
      expect(onlineUsers).toContain("user-a");
      expect(onlineUsers).toContain("user-b");
      expect(onlineUsers).toHaveLength(2);
    });
  });

  describe("handleDisconnect - 用戶斷線", () => {
    it("應該廣播 user_offline 事件並從在線列表移除", async () => {
      const mockClient = createMockSocket("socket-1", "valid-token");
      authenticateSocket(mockClient, "user-a");
      expect(await gateway.getOnlineUsers()).toContain("user-a");

      gateway.handleDisconnect(mockClient as any);

      expect((gateway as any).server.emit).toHaveBeenCalledWith(
        "user_offline",
        { userId: "user-a" },
      );
      expect(await gateway.getOnlineUsers()).not.toContain("user-a");
    });

    it("未認證的連線斷開不應該影響在線列表", async () => {
      const c1 = createMockSocket("socket-1", "valid-token");
      const c2 = createMockSocket("socket-unknown");

      authenticateSocket(c1, "user-a");
      gateway.handleDisconnect(c2 as any);

      expect(await gateway.getOnlineUsers()).toEqual(["user-a"]);
    });
  });

  describe("getConnectionCount - 連線數統計 (N-002)", () => {
    it("應該正確回報連線數", () => {
      expect(gateway.getConnectionCount()).toBe(0);

      const c1 = createMockSocket("s1", "t1");
      const c2 = createMockSocket("s2", "t2");
      authenticateSocket(c1, "u1");
      authenticateSocket(c2, "u2");

      expect(gateway.getConnectionCount()).toBe(2);
    });
  });
});
