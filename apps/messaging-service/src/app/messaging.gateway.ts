/**
 * MessagingGateway - WebSocket 即時訊息閘道
 *
 * 負責：
 * - 用戶連線管理（上線/離線追蹤）
 * - 即時訊息收發（透過 Socket.IO）
 * - 輸入中狀態廣播
 * - 消費 Kafka "message.created" 事件並推送至相關 Socket
 *
 * 注意：@nestjs/websockets 和 @nestjs/platform-socket.io 套件需要安裝
 *       npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
 */

import { Logger, OnModuleInit } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { MessagingService } from "./messaging.service";
import { KafkaConsumerService } from "@suggar-daddy/kafka";

/** 加入房間的資料結構 */
interface JoinPayload {
  userId: string;
}

/** 發送訊息的資料結構 */
interface SendMessagePayload {
  senderId: string;
  conversationId: string;
  content: string;
}

/** 輸入中狀態的資料結構 */
interface TypingPayload {
  userId: string;
  conversationId: string;
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(MessagingGateway.name);

  /** 追蹤在線用戶：userId -> Socket */
  private onlineUsers: Map<string, Socket> = new Map();

  /** 反向映射：socket.id -> userId，用於斷線時查找 */
  private socketToUser: Map<string, string> = new Map();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagingService: MessagingService,
    private readonly kafkaConsumer: KafkaConsumerService,
  ) {}

  /**
   * 模組初始化時訂閱 Kafka "message.created" 主題
   * 當有新訊息透過 REST API 或其他途徑產生時，也能即時推送給在線用戶
   */
  async onModuleInit() {
    try {
      await this.kafkaConsumer.subscribe("message.created", async (payload) => {
        const { message } = payload;
        const event = JSON.parse(message.value.toString());

        this.logger.log(
          `Kafka message.created 事件: messageId=${event.messageId} conversationId=${event.conversationId}`,
        );

        // 將訊息推送到對話房間中的所有連線用戶
        this.server.to(`conversation:${event.conversationId}`).emit("new_message", {
          id: event.messageId,
          conversationId: event.conversationId,
          senderId: event.senderId,
          content: event.content,
          createdAt: event.createdAt,
        });
      });

      // 注意：startConsuming 已由 MatchingEventConsumer 呼叫
      // 如果此 Gateway 獨立運作，需確保 startConsuming 被呼叫
      this.logger.log("已訂閱 Kafka message.created 主題");
    } catch (error) {
      this.logger.error("訂閱 Kafka message.created 失敗（優雅降級，WebSocket 仍可運作）:", error);
    }
  }

  /**
   * WebSocket 伺服器初始化完成回呼
   */
  afterInit(_server: Server) {
    this.logger.log("WebSocket Gateway 已初始化");
  }

  /**
   * 用戶連線處理
   * 記錄連線資訊，等待用戶透過 "join" 事件註冊身份
   */
  handleConnection(client: Socket) {
    this.logger.log(`用戶連線: socketId=${client.id}`);
  }

  /**
   * 用戶斷線處理
   * 從在線用戶列表移除，並通知其他用戶
   */
  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.onlineUsers.delete(userId);
      this.socketToUser.delete(client.id);
      this.logger.log(`用戶離線: userId=${userId} socketId=${client.id}`);

      // 廣播用戶離線事件
      this.server.emit("user_offline", { userId });
    } else {
      this.logger.log(`未認證的連線斷開: socketId=${client.id}`);
    }
  }

  /**
   * 處理 "join" 事件 — 用戶加入自己的房間
   *
   * 用戶連線後，需發送此事件來註冊身份。
   * 未來可在此步驟驗證 JWT token。
   *
   * @param client - Socket 連線實例
   * @param data - 包含 userId 的資料
   */
  @SubscribeMessage("join")
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinPayload,
  ) {
    const { userId } = data;

    if (!userId) {
      this.logger.warn(`join 事件缺少 userId: socketId=${client.id}`);
      return { event: "error", data: { message: "userId 為必填欄位" } };
    }

    // 如果該用戶已有舊連線，清除舊的映射
    const existingSocket = this.onlineUsers.get(userId);
    if (existingSocket && existingSocket.id !== client.id) {
      this.socketToUser.delete(existingSocket.id);
    }

    // 註冊用戶連線
    this.onlineUsers.set(userId, client);
    this.socketToUser.set(client.id, userId);

    // 加入以 userId 命名的個人房間（用於私人通知）
    client.join(`user:${userId}`);

    this.logger.log(`用戶加入: userId=${userId} socketId=${client.id}`);

    // 廣播用戶上線事件
    this.server.emit("user_online", { userId });

    return { event: "joined", data: { userId, message: "已成功加入" } };
  }

  /**
   * 處理 "send_message" 事件 — 發送即時訊息
   *
   * 透過 MessagingService.send() 儲存訊息到 Redis 並發送 Kafka 事件，
   * 同時立即透過 WebSocket 廣播給對話中的所有參與者。
   *
   * @param client - Socket 連線實例
   * @param data - 包含 senderId, conversationId, content 的資料
   */
  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessagePayload,
  ) {
    const { senderId, conversationId, content } = data;

    if (!senderId || !conversationId || !content) {
      return {
        event: "error",
        data: { message: "senderId, conversationId, content 為必填欄位" },
      };
    }

    try {
      // 驗證發送者是否為對話參與者
      const isParticipant = await this.messagingService.isParticipant(
        conversationId,
        senderId,
      );
      if (!isParticipant) {
        return {
          event: "error",
          data: { message: "您不是此對話的參與者" },
        };
      }

      // 透過 MessagingService 儲存訊息（Redis + Kafka 事件）
      const message = await this.messagingService.send(
        senderId,
        conversationId,
        content,
      );

      // 讓發送者加入對話房間（如果尚未加入）
      client.join(`conversation:${conversationId}`);

      // 廣播新訊息給對話房間中的所有人（包括發送者）
      this.server.to(`conversation:${conversationId}`).emit("new_message", {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      });

      this.logger.log(
        `訊息已發送: messageId=${message.id} conversationId=${conversationId}`,
      );

      return { event: "message_sent", data: { messageId: message.id } };
    } catch (error) {
      this.logger.error(`發送訊息失敗: conversationId=${conversationId}`, error);
      return {
        event: "error",
        data: { message: "發送訊息失敗，請稍後再試" },
      };
    }
  }

  /**
   * 處理 "typing" 事件 — 廣播輸入中狀態
   *
   * 將用戶的輸入狀態廣播給對話房間中的其他參與者。
   *
   * @param client - Socket 連線實例
   * @param data - 包含 userId, conversationId 的資料
   */
  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ) {
    const { userId, conversationId } = data;

    if (!userId || !conversationId) {
      return;
    }

    // 廣播給對話房間中的其他人（排除發送者自己）
    client.to(`conversation:${conversationId}`).emit("user_typing", {
      userId,
      conversationId,
    });

    // 讓發送者加入對話房間（如果尚未加入）
    client.join(`conversation:${conversationId}`);
  }

  /**
   * 取得目前所有在線用戶的 ID 列表
   *
   * @returns 在線用戶 ID 陣列
   */
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }
}