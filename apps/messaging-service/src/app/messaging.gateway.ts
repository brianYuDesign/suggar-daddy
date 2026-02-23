/**
 * MessagingGateway - WebSocket 即時訊息閘道
 *
 * 負責：
 * - JWT 身份驗證（連線時驗證 token）
 * - 用戶連線管理（上線/離線追蹤）
 * - 即時訊息收發（透過 Socket.IO）
 * - 輸入中狀態廣播
 * - 消費 Kafka "message.created" 事件並推送至相關 Socket
 *
 * 安全措施：
 * - handleConnection 強制驗證 JWT token，拒絕未認證連線
 * - 所有 WS 事件使用已驗證的 userId，忽略客戶端傳入的 userId
 * - CORS 根據環境變數配置，非萬用字元
 */

import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
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
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { RedisService } from "@suggar-daddy/redis";
import { MessagingService } from "./messaging.service";
import { KafkaConsumerService } from "@suggar-daddy/kafka";
import { InjectLogger } from "@suggar-daddy/common";

/** [N-005] Redis 上線狀態 key */
const WS_ONLINE_SET = "ws:online";
const WS_PRESENCE_KEY = (userId: string) => `ws:presence:${userId}`;
/** 單使用者 presence TTL（秒），heartbeat 會定期刷新 */
const PRESENCE_TTL = 120;
/** Heartbeat 間隔（毫秒），用於刷新 Redis presence TTL */
const HEARTBEAT_INTERVAL = 30_000;

/** 已驗證的 Socket 擴展介面 */
interface AuthenticatedSocket extends Socket {
  /** 透過 JWT 驗證後附加的 userId */
  __userId?: string;
}

/** 發送訊息的資料結構（不再需要 senderId，由 JWT 驗證提供） */
interface SendMessagePayload {
  conversationId: string;
  content: string;
}

/** 已讀標記的資料結構（不再需要 userId） */
interface MarkReadPayload {
  conversationId: string;
  messageId: string;
}

/** 輸入中狀態的資料結構（不再需要 userId） */
interface TypingPayload {
  conversationId: string;
}

const WS_CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:4200", "http://localhost:4300"];

@WebSocketGateway({
  cors: {
    origin: WS_CORS_ORIGINS,
  },
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @InjectLogger() private readonly logger!: Logger;

  /** 追蹤本地在線用戶：userId -> Socket（用於本實例的 socket 管理） */
  private onlineUsers: Map<string, AuthenticatedSocket> = new Map();

  /** 反向映射：socket.id -> userId，用於斷線時查找 */
  private socketToUser: Map<string, string> = new Map();

  /** [N-005] Heartbeat 定時器，定期刷新 Redis presence TTL */
  private heartbeatTimer?: ReturnType<typeof setInterval>;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagingService: MessagingService,
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
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

      // Ensure consumer is started (idempotent — safe if already started by another consumer)
      await this.kafkaConsumer.startConsuming();
      this.logger.log("已訂閱 Kafka message.created 主題");
    } catch (error) {
      this.logger.error("訂閱 Kafka message.created 失敗（優雅降級，WebSocket 仍可運作）:", error);
    }
  }

  /**
   * WebSocket 伺服器初始化完成回呼
   */
  afterInit(_server: Server) {
    // [N-005] 啟動 heartbeat 定時器，定期刷新 Redis presence TTL
    this.heartbeatTimer = setInterval(
      () => this.refreshPresence(),
      HEARTBEAT_INTERVAL,
    );
    this.logger.log("WebSocket Gateway 已初始化");
  }

  /**
   * [N-005] 模組銷毀時清理 heartbeat 定時器
   */
  onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }

  /**
   * [F-002] 用戶連線處理 — JWT 身份驗證
   *
   * 從 handshake.auth.token 或 Authorization header 提取 JWT，
   * 驗證後將 userId 附加到 socket 上。未通過驗證的連線會被斷開。
   */
  handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        this.logger.warn(`未認證連線被拒: socketId=${client.id}`);
        client.emit("error", { message: "需要提供認證 token" });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      if (!userId) {
        client.emit("error", { message: "無效的 token" });
        client.disconnect();
        return;
      }

      // 附加已驗證 userId 到 socket
      client.__userId = userId;
      this.socketToUser.set(client.id, userId);

      // 如果該用戶已有舊連線，清除舊的映射
      const existingSocket = this.onlineUsers.get(userId);
      if (existingSocket && existingSocket.id !== client.id) {
        this.socketToUser.delete(existingSocket.id);
      }

      this.onlineUsers.set(userId, client);

      // [N-005] 同步到 Redis：加入全域上線集合 + 設定 presence key (TTL)
      this.redis.sAdd(WS_ONLINE_SET, userId).catch(() => {});
      this.redis.set(WS_PRESENCE_KEY(userId), "1", PRESENCE_TTL).catch(() => {});

      // 自動加入以 userId 命名的個人房間
      client.join(`user:${userId}`);

      this.logger.log(`用戶已認證連線: userId=${userId} socketId=${client.id}`);

      // 廣播用戶上線事件
      this.server.emit("user_online", { userId });

      // 回傳認證成功
      client.emit("authenticated", { userId });
    } catch (error) {
      this.logger.warn(
        `JWT 驗證失敗: socketId=${client.id} error=${(error as Error).message}`,
      );
      client.emit("error", { message: "認證失敗，token 無效或已過期" });
      client.disconnect();
    }
  }

  /**
   * 用戶斷線處理
   * 從在線用戶列表移除，並通知其他用戶
   */
  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.__userId || this.socketToUser.get(client.id);
    if (userId) {
      this.onlineUsers.delete(userId);
      this.socketToUser.delete(client.id);

      // [N-005] 只有本實例已無此用戶的連線時，才從 Redis 移除
      if (!this.onlineUsers.has(userId)) {
        this.redis.sRem(WS_ONLINE_SET, userId).catch(() => {});
        this.redis.del(WS_PRESENCE_KEY(userId)).catch(() => {});
      }

      this.logger.log(`用戶離線: userId=${userId} socketId=${client.id}`);

      // 廣播用戶離線事件
      this.server.emit("user_offline", { userId });
    } else {
      this.logger.log(`未認證的連線斷開: socketId=${client.id}`);
    }
  }

  /**
   * 從 socket 取得已驗證的 userId
   */
  private getAuthUserId(client: AuthenticatedSocket): string | null {
    return client.__userId || this.socketToUser.get(client.id) || null;
  }

  /**
   * 處理 "join" 事件 — 確認已認證連線
   *
   * 連線時已自動驗證 JWT 並加入個人房間。
   * 此事件現僅用於向前相容，userId 從已驗證的 socket 取得。
   *
   * @param client - Socket 連線實例
   */
  @SubscribeMessage("join")
  handleJoin(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = this.getAuthUserId(client);

    if (!userId) {
      return { event: "error", data: { message: "未認證的連線" } };
    }

    this.logger.log(`用戶加入確認: userId=${userId} socketId=${client.id}`);

    return { event: "joined", data: { userId, message: "已成功加入" } };
  }

  /**
   * [W-007] 處理 "send_message" 事件 — 發送即時訊息
   *
   * 使用 JWT 驗證的 userId 作為 senderId（忽略客戶端傳入的 senderId）。
   * MessagingService.send() 內含封鎖檢查、門檻檢查、內容審核。
   *
   * @param client - Socket 連線實例
   * @param data - 包含 conversationId, content 的資料
   */
  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessagePayload,
  ) {
    const senderId = this.getAuthUserId(client);
    if (!senderId) {
      return { event: "error", data: { message: "未認證的連線" } };
    }

    const { conversationId, content } = data;

    if (!conversationId || !content) {
      return {
        event: "error",
        data: { message: "conversationId, content 為必填欄位" },
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

      // 透過 MessagingService 儲存訊息（包含封鎖檢查 + 門檻 + Redis + Kafka）
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
        data: { message: (error as Error).message || "發送訊息失敗，請稍後再試" },
      };
    }
  }

  /**
   * 處理 "typing" 事件 — 廣播輸入中狀態（使用已驗證 userId）
   *
   * @param client - Socket 連線實例
   * @param data - 包含 conversationId 的資料
   */
  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingPayload,
  ) {
    const userId = this.getAuthUserId(client);
    if (!userId || !data.conversationId) {
      return;
    }

    // 廣播給對話房間中的其他人（排除發送者自己）
    client.to(`conversation:${data.conversationId}`).emit("user_typing", {
      userId,
      conversationId: data.conversationId,
    });

    // 讓發送者加入對話房間（如果尚未加入）
    client.join(`conversation:${data.conversationId}`);
  }

  /**
   * 處理 "mark_read" 事件 — 標記訊息已讀（使用已驗證 userId）
   */
  @SubscribeMessage("mark_read")
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: MarkReadPayload,
  ) {
    const userId = this.getAuthUserId(client);
    if (!userId) {
      return { event: "error", data: { message: "未認證的連線" } };
    }

    const { conversationId, messageId } = data;

    if (!conversationId || !messageId) {
      return {
        event: "error",
        data: { message: "conversationId, messageId 為必填欄位" },
      };
    }

    try {
      await this.messagingService.markAsRead(userId, conversationId, messageId);

      // 廣播已讀事件給對話房間中的其他人
      client.to(`conversation:${conversationId}`).emit("message_read", {
        userId,
        conversationId,
        messageId,
        readAt: new Date().toISOString(),
      });

      return { event: "read_marked", data: { conversationId, messageId } };
    } catch (error) {
      this.logger.error(`標記已讀失敗: conversationId=${conversationId}`, error);
      return {
        event: "error",
        data: { message: "標記已讀失敗" },
      };
    }
  }

  /**
   * [N-005] 取得全域在線用戶（從 Redis SET 讀取，跨實例）
   */
  async getOnlineUsers(): Promise<string[]> {
    try {
      return await this.redis.sMembers(WS_ONLINE_SET);
    } catch {
      // Redis 故障時回退到本地 Map
      return Array.from(this.onlineUsers.keys());
    }
  }

  /**
   * 取得本實例的 WebSocket 連線數（用於健康檢查）
   */
  getConnectionCount(): number {
    return this.onlineUsers.size;
  }

  /**
   * [N-005] 定期刷新 Redis presence TTL，防止實例異常終止時用戶永久留在線上集合
   */
  private async refreshPresence(): Promise<void> {
    for (const userId of this.onlineUsers.keys()) {
      try {
        await this.redis.expire(WS_PRESENCE_KEY(userId), PRESENCE_TTL);
      } catch {
        // silent — heartbeat 失敗不影響運作
      }
    }
  }
}
