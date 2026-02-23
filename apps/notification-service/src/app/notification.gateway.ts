/**
 * NotificationGateway - WebSocket 即時通知閘道
 *
 * 負責：
 * - 用戶連線管理（上線/離線追蹤）
 * - 消費 Kafka "notification.created" 事件並推送至相關 Socket
 * - 支援透過 WebSocket 標記通知為已讀
 */

import { Logger, OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { KafkaConsumerService } from '@suggar-daddy/kafka';
import { InjectLogger } from '@suggar-daddy/common';
import { NotificationService } from './notification.service';

interface JoinPayload {
  userId: string;
}

interface MarkReadPayload {
  notificationId: string;
}

interface MarkAllReadPayload {
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @InjectLogger() private readonly logger!: Logger;

  /** 追蹤在線用戶：userId -> Socket */
  private onlineUsers: Map<string, Socket> = new Map();

  /** 反向映射：socket.id -> userId */
  private socketToUser: Map<string, string> = new Map();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly kafkaConsumer: KafkaConsumerService,
  ) {}

  /**
   * 模組初始化時訂閱 Kafka "notification.created" 主題
   * 當有新通知產生時，即時推送給在線用戶
   */
  async onModuleInit() {
    try {
      await this.kafkaConsumer.subscribe('notification.created', async (payload) => {
        const { message } = payload;
        const event = JSON.parse(message.value.toString());

        this.logger.log(
          `Kafka notification.created 事件: id=${event.notificationId} userId=${event.userId}`,
        );

        // 推送通知到用戶的個人房間
        if (event.userId) {
          this.server.to(`user:${event.userId}`).emit('notification', {
            id: event.notificationId,
            type: event.type,
            title: event.title,
            body: event.body,
            read: false,
            createdAt: event.createdAt,
          });
        }
      });

      // Ensure consumer is started (idempotent — safe if already started by another consumer)
      await this.kafkaConsumer.startConsuming();
      this.logger.log('已訂閱 Kafka notification.created 主題');
    } catch (error) {
      this.logger.error('訂閱 Kafka notification.created 失敗（優雅降級）:', error);
    }
  }

  afterInit() {
    this.logger.log('Notification WebSocket Gateway 已初始化');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`通知連線: socketId=${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.onlineUsers.delete(userId);
      this.socketToUser.delete(client.id);
      this.logger.debug(`通知離線: userId=${userId}`);
    }
  }

  /**
   * 用戶加入通知頻道
   */
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinPayload,
  ) {
    const { userId } = data;
    if (!userId) {
      return { event: 'error', data: { message: 'userId 為必填欄位' } };
    }

    const existing = this.onlineUsers.get(userId);
    if (existing && existing.id !== client.id) {
      this.socketToUser.delete(existing.id);
    }

    this.onlineUsers.set(userId, client);
    this.socketToUser.set(client.id, userId);
    client.join(`user:${userId}`);

    this.logger.debug(`用戶加入通知頻道: userId=${userId}`);
    return { event: 'joined', data: { userId } };
  }

  /**
   * 標記單則通知為已讀
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MarkReadPayload,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId || !data.notificationId) return;

    await this.notificationService.markRead(userId, data.notificationId);
    return { event: 'marked_read', data: { notificationId: data.notificationId } };
  }

  /**
   * 標記所有通知為已讀
   */
  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() _data: MarkAllReadPayload,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    const result = await this.notificationService.markAllRead(userId);
    return { event: 'all_marked_read', data: { count: result.count } };
  }
}
