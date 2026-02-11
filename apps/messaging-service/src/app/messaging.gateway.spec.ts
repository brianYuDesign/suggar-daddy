/**
 * MessagingGateway 單元測試
 *
 * 測試 WebSocket 即時訊息閘道的核心功能：
 * - handleJoin: 用戶加入房間
 * - handleSendMessage: 發送訊息（呼叫 MessagingService.send）
 * - handleTyping: 輸入中狀態廣播
 * - getOnlineUsers: 在線用戶追蹤（連線/斷線）
 * - handleDisconnect: 用戶斷線清理
 */

import { Test, TestingModule } from "@nestjs/testing";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";
import { KafkaConsumerService } from "@suggar-daddy/kafka";

/** 建立模擬 Socket 物件 */
function createMockSocket(id: string) {
  return {
    id,
    join: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };
}

/** 模擬 MessagingService */
const mockMessagingService = {
  send: jest.fn(),
  isParticipant: jest.fn(),
  ensureConversation: jest.fn(),
  getConversations: jest.fn(),
  getMessages: jest.fn(),
};

/** 模擬 KafkaConsumerService */
const mockKafkaConsumerService = {
  subscribe: jest.fn(),
  startConsuming: jest.fn(),
};

describe("MessagingGateway", () => {
  let gateway: MessagingGateway;

  beforeEach(async () => {
    // 重置所有 mock
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        { provide: MessagingService, useValue: mockMessagingService },
        { provide: KafkaConsumerService, useValue: mockKafkaConsumerService },
      ],
    }).compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);

    // 模擬 WebSocket Server
    (gateway as any).server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  describe("handleJoin - 用戶加入房間", () => {
    it("應該將用戶加入房間並追蹤在線狀態", () => {
      // 準備模擬 Socket
      const mockClient = createMockSocket("socket-1");
      const data = { userId: "user-123" };

      // 執行加入
      const result = gateway.handleJoin(mockClient as any, data);

      // 驗證用戶已加入個人房間
      expect(mockClient.join).toHaveBeenCalledWith("user:user-123");

      // 驗證返回成功訊息
      expect(result).toEqual({
        event: "joined",
        data: { userId: "user-123", message: "已成功加入" },
      });

      // 驗證用戶已被追蹤為在線
      expect(gateway.getOnlineUsers()).toContain("user-123");
    });

    it("缺少 userId 時應該回傳錯誤", () => {
      const mockClient = createMockSocket("socket-2");
      const data = { userId: "" };

      const result = gateway.handleJoin(mockClient as any, data);

      // 驗證回傳錯誤
      expect(result).toEqual({
        event: "error",
        data: { message: "userId 為必填欄位" },
      });

      // 驗證用戶未被追蹤
      expect(gateway.getOnlineUsers()).not.toContain("");
    });

    it("同一用戶重複加入時應該更新 Socket 映射", () => {
      const mockClient1 = createMockSocket("socket-old");
      const mockClient2 = createMockSocket("socket-new");
      const data = { userId: "user-456" };

      // 第一次加入
      gateway.handleJoin(mockClient1 as any, data);
      // 第二次加入（新連線）
      gateway.handleJoin(mockClient2 as any, data);

      // 驗證在線用戶仍然只有一個
      const onlineUsers = gateway.getOnlineUsers();
      expect(onlineUsers.filter((id) => id === "user-456")).toHaveLength(1);
    });
  });

  describe("handleSendMessage - 發送訊息", () => {
    it("應該呼叫 MessagingService.send() 並廣播訊息", async () => {
      const mockClient = createMockSocket("socket-1");
      const data = {
        senderId: "user-a",
        conversationId: "user-a::user-b",
        content: "你好！",
      };

      // 模擬 isParticipant 回傳 true
      mockMessagingService.isParticipant.mockResolvedValue(true);

      // 模擬 send 回傳訊息
      const mockMessage = {
        id: "msg-001",
        conversationId: "user-a::user-b",
        senderId: "user-a",
        content: "你好！",
        createdAt: new Date("2025-01-01"),
      };
      mockMessagingService.send.mockResolvedValue(mockMessage);

      // 執行發送
      const result = await gateway.handleSendMessage(mockClient as any, data);

      // 驗證 MessagingService.send 被呼叫
      expect(mockMessagingService.send).toHaveBeenCalledWith(
        "user-a",
        "user-a::user-b",
        "你好！",
      );

      // 驗證訊息被廣播到對話房間
      expect((gateway as any).server.to).toHaveBeenCalledWith(
        "conversation:user-a::user-b",
      );

      // 驗證返回成功
      expect(result).toEqual({
        event: "message_sent",
        data: { messageId: "msg-001" },
      });
    });

    it("缺少必填欄位時應該回傳錯誤", async () => {
      const mockClient = createMockSocket("socket-1");
      const data = {
        senderId: "",
        conversationId: "conv-1",
        content: "test",
      };

      const result = await gateway.handleSendMessage(mockClient as any, data);

      expect(result).toEqual({
        event: "error",
        data: { message: "senderId, conversationId, content 為必填欄位" },
      });

      // 驗證 MessagingService.send 未被呼叫
      expect(mockMessagingService.send).not.toHaveBeenCalled();
    });

    it("非對話參與者時應該回傳錯誤", async () => {
      const mockClient = createMockSocket("socket-1");
      const data = {
        senderId: "user-intruder",
        conversationId: "user-a::user-b",
        content: "偷看",
      };

      // 模擬 isParticipant 回傳 false
      mockMessagingService.isParticipant.mockResolvedValue(false);

      const result = await gateway.handleSendMessage(mockClient as any, data);

      expect(result).toEqual({
        event: "error",
        data: { message: "您不是此對話的參與者" },
      });

      // 驗證 send 未被呼叫
      expect(mockMessagingService.send).not.toHaveBeenCalled();
    });

    it("MessagingService.send 拋出例外時應該回傳錯誤", async () => {
      const mockClient = createMockSocket("socket-1");
      const data = {
        senderId: "user-a",
        conversationId: "user-a::user-b",
        content: "test",
      };

      mockMessagingService.isParticipant.mockResolvedValue(true);
      mockMessagingService.send.mockRejectedValue(new Error("Redis error"));

      const result = await gateway.handleSendMessage(mockClient as any, data);

      expect(result).toEqual({
        event: "error",
        data: { message: "發送訊息失敗，請稍後再試" },
      });
    });
  });

  describe("handleTyping - 輸入中狀態", () => {
    it("應該廣播 typing 狀態給對話房間中的其他人", () => {
      const mockClient = createMockSocket("socket-1");
      const data = { userId: "user-a", conversationId: "conv-1" };

      gateway.handleTyping(mockClient as any, data);

      // 驗證廣播給對話房間（排除自己）
      expect(mockClient.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockClient.emit).toHaveBeenCalledWith("user_typing", {
        userId: "user-a",
        conversationId: "conv-1",
      });

      // 驗證用戶加入對話房間
      expect(mockClient.join).toHaveBeenCalledWith("conversation:conv-1");
    });

    it("缺少欄位時不應該廣播", () => {
      const mockClient = createMockSocket("socket-1");
      const data = { userId: "", conversationId: "" };

      gateway.handleTyping(mockClient as any, data);

      // 驗證未廣播
      expect(mockClient.to).not.toHaveBeenCalled();
    });
  });

  describe("getOnlineUsers - 在線用戶追蹤", () => {
    it("初始狀態應該沒有在線用戶", () => {
      expect(gateway.getOnlineUsers()).toEqual([]);
    });

    it("用戶加入後應該出現在在線列表", () => {
      const mockClient = createMockSocket("socket-1");
      gateway.handleJoin(mockClient as any, { userId: "user-a" });

      expect(gateway.getOnlineUsers()).toEqual(["user-a"]);
    });

    it("多個用戶加入後應該全部出現在在線列表", () => {
      const mockClient1 = createMockSocket("socket-1");
      const mockClient2 = createMockSocket("socket-2");

      gateway.handleJoin(mockClient1 as any, { userId: "user-a" });
      gateway.handleJoin(mockClient2 as any, { userId: "user-b" });

      const onlineUsers = gateway.getOnlineUsers();
      expect(onlineUsers).toContain("user-a");
      expect(onlineUsers).toContain("user-b");
      expect(onlineUsers).toHaveLength(2);
    });

    it("用戶斷線後應該從在線列表移除", () => {
      const mockClient = createMockSocket("socket-1");

      // 先加入
      gateway.handleJoin(mockClient as any, { userId: "user-a" });
      expect(gateway.getOnlineUsers()).toContain("user-a");

      // 斷線
      gateway.handleDisconnect(mockClient as any);
      expect(gateway.getOnlineUsers()).not.toContain("user-a");
      expect(gateway.getOnlineUsers()).toEqual([]);
    });

    it("未認證的連線斷開不應該影響在線列表", () => {
      const mockClient1 = createMockSocket("socket-1");
      const mockClient2 = createMockSocket("socket-unknown");

      // user-a 加入
      gateway.handleJoin(mockClient1 as any, { userId: "user-a" });

      // 未認證的 socket 斷開
      gateway.handleDisconnect(mockClient2 as any);

      // user-a 仍在線
      expect(gateway.getOnlineUsers()).toEqual(["user-a"]);
    });
  });

  describe("handleDisconnect - 用戶斷線", () => {
    it("應該廣播 user_offline 事件", () => {
      const mockClient = createMockSocket("socket-1");

      gateway.handleJoin(mockClient as any, { userId: "user-a" });
      gateway.handleDisconnect(mockClient as any);

      // 驗證廣播離線事件
      expect((gateway as any).server.emit).toHaveBeenCalledWith(
        "user_offline",
        { userId: "user-a" },
      );
    });
  });
});